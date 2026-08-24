@extends('layouts.app')
@section('title', 'POS Terminal - ECS POS')
@section('content')
<div class="pos">
    <section class="pos-left">
        <div class="topline">
            <div><h1 class="h1">POS Terminal</h1><p class="sub">Scan the sticker barcode. The serial number fetches the exact laptop record.</p></div>
            <span class="chip ok">Scanner Ready</span>
        </div>
        <div class="scan-panel">
            <div class="field" style="margin:0">
                <label>Barcode / Serial Number</label>
                <input id="scanInput" class="input scan" placeholder="Scan barcode or type serial and press Enter" autocomplete="off" autofocus>
            </div>
            <p style="margin:12px 0 0;color:#dffcf7">USB scanners should be configured with Enter/CR suffix. Scan -> lookup -> confirm specs -> add to cart.</p>
        </div>
        <div class="scan-meta">
            <div><span class="label">Last Scan</span><br><strong id="lastScan">Waiting for scan</strong></div>
            <div><span class="label">Model Lookup</span><br><strong id="lookupModel">-</strong></div>
            <div><span class="label">Base Specs</span><br><strong id="lookupSpecs">-</strong></div>
        </div>
        <div class="card pos-help" style="margin-top:18px">
            <h2 style="margin-top:0">How serialized checkout works</h2>
            <div class="grid grid-3">
                <div><strong>1. Scan serial</strong><p class="sub">Barcode stores the inventory serial number only.</p></div>
                <div><strong>2. Confirm variants</strong><p class="sub">RAM, capacity, and drive type are selected before cart.</p></div>
                <div><strong>3. Print warranty</strong><p class="sub">Receipt snapshots serial, CPU, GPU, RAM, storage, and drive type.</p></div>
            </div>
        </div>
    </section>
    <aside class="pos-cart">
        <div class="cart-head">
            <h2 style="margin:0">Active Cart</h2>
            <p style="margin:4px 0 0;color:#cbd5e1">One quantity per serial number</p>
        </div>
        <div class="cart-body">
            <div id="cartItems"><p class="sub">No laptops scanned.</p></div>
        </div>
        <div class="cart-actions">
            <div class="grid grid-2">
                <div class="field">
                    <label>Discount</label>
                    <select id="discount" class="select">
                        <option value="">No discount</option>
                        @foreach($discounts as $discount)
                            <option value="{{ $discount->id }}" data-type="{{ $discount->type }}" data-value="{{ $discount->value }}">{{ $discount->name }} ({{ $discount->type === 'PERCENTAGE' ? $discount->value.'%' : \App\Support\Money::format($discount->value) }})</option>
                        @endforeach
                    </select>
                </div>
                <div class="field">
                    <label>Payment</label>
                    <select id="paymentMethod" class="select"><option>CASH</option><option>CARD</option><option>TRANSFER</option></select>
                </div>
            </div>
            <div class="totals">
                <div class="row"><span>Subtotal</span><strong id="subtotal">Rs. 0.00</strong></div>
                <div class="row"><span>Discount</span><strong id="discountAmount">Rs. 0.00</strong></div>
                <div class="row"><span>GST 18%</span><strong id="taxAmount">Rs. 0.00</strong></div>
                <div class="row total"><span>Total</span><span id="totalAmount">Rs. 0.00</span></div>
            </div>
            <button id="payButton" class="btn primary big" style="width:100%;margin-top:16px" disabled>Pay & Print Receipt</button>
        </div>
    </aside>
</div>
<div class="modal" id="specModal">
    <div class="modal-card">
        <div class="topline" style="margin-bottom:14px">
            <div><h2 style="margin:0;font-size:24px">Confirm Laptop Specs</h2><p id="specSummary" class="sub"></p></div>
            <span class="chip warn" id="specSerial"></span>
        </div>
        <div class="grid grid-3" style="margin-bottom:14px">
            <div class="card" style="box-shadow:none"><span class="label">Model</span><br><strong id="lockedModel"></strong></div>
            <div class="card" style="box-shadow:none"><span class="label">CPU</span><br><strong id="lockedCpu"></strong></div>
            <div class="card" style="box-shadow:none"><span class="label">GPU</span><br><strong id="lockedGpu"></strong></div>
        </div>
        <div class="grid grid-3">
            <div class="field"><label>Confirmed RAM</label><select id="ramInput" class="select">@foreach($ramOptions as $option)<option value="{{ $option }}">{{ $option }}</option>@endforeach</select></div>
            <div class="field"><label>Storage Capacity</label><select id="storageInput" class="select">@foreach($storageOptions as $option)<option value="{{ $option }}">{{ $option }}</option>@endforeach</select></div>
            <div class="field"><label>Drive Type</label><select id="driveTypeInput" class="select">@foreach($driveTypeOptions as $option)<option value="{{ $option }}">{{ $option }}</option>@endforeach</select></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px"><button class="btn light" id="cancelSpec">Cancel</button><button class="btn primary" id="addSpec">Add to Cart</button></div>
    </div>
</div>
<div class="toast" id="toast"></div>
<script>
const csrf = document.querySelector('meta[name="csrf-token"]').content;
const cart = [];
let pendingItem = null;
const scanInput = document.getElementById('scanInput');
const cartItems = document.getElementById('cartItems');
const discount = document.getElementById('discount');
const payButton = document.getElementById('payButton');
const modal = document.getElementById('specModal');
const fmt = amount => 'Rs. ' + Number(amount).toLocaleString('en-PK', {minimumFractionDigits:2, maximumFractionDigits:2});
function toast(message){const t=document.getElementById('toast');t.textContent=message;t.style.display='block';setTimeout(()=>t.style.display='none',3200)}
function setSelectValue(id, value){const el=document.getElementById(id); if ([...el.options].some(o=>o.value===value)) el.value=value;}
function totals(){
    const subtotal = cart.reduce((sum, item) => sum + Number(item.retail_price), 0);
    const opt = discount.selectedOptions[0];
    let discountAmount = 0;
    if (opt && opt.value) {
        const val = Number(opt.dataset.value);
        discountAmount = opt.dataset.type === 'PERCENTAGE' ? subtotal * val / 100 : val;
    }
    discountAmount = Math.min(discountAmount, subtotal);
    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = Math.round(taxable * 18) / 100;
    const total = taxable + tax;
    document.getElementById('subtotal').textContent = fmt(subtotal);
    document.getElementById('discountAmount').textContent = fmt(discountAmount);
    document.getElementById('taxAmount').textContent = fmt(tax);
    document.getElementById('totalAmount').textContent = fmt(total);
    payButton.disabled = cart.length === 0;
}
function renderCart(){
    if (!cart.length) cartItems.innerHTML = '<p class="sub">No laptops scanned.</p>';
    else cartItems.innerHTML = cart.map((item, i) => `<div class="cart-item"><div class="cart-title">${item.model_name}</div><span class="label">${item.serial_number}</span><br>${item.processor}<br>${item.gpu}<br><strong>${item.confirmed_ram} / ${item.confirmed_storage} / ${item.confirmed_drive_type}</strong><div class="row" style="margin-top:10px"><strong>${fmt(item.retail_price)}</strong><button class="btn light" onclick="removeItem(${i})">Remove</button></div></div>`).join('');
    totals();
}
window.removeItem = i => { cart.splice(i,1); renderCart(); };
scanInput.addEventListener('keydown', async event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const serial = scanInput.value.trim();
    if (!serial) return;
    document.getElementById('lastScan').textContent = serial;
    if (cart.some(item => item.serial_number === serial)) { toast('That serial is already in the cart.'); scanInput.value=''; return; }
    try {
        const res = await fetch('{{ route('pos.lookup') }}', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf,'Accept':'application/json'}, body:JSON.stringify({serial_number:serial})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lookup failed.');
        pendingItem = data;
        document.getElementById('lookupModel').textContent = data.model_name;
        document.getElementById('lookupSpecs').textContent = `${data.processor} / ${data.gpu}`;
        document.getElementById('specSummary').textContent = 'Locked base specs loaded from inventory.';
        document.getElementById('specSerial').textContent = data.serial_number;
        document.getElementById('lockedModel').textContent = data.model_name;
        document.getElementById('lockedCpu').textContent = data.processor;
        document.getElementById('lockedGpu').textContent = data.gpu;
        setSelectValue('ramInput', data.ram);
        setSelectValue('storageInput', data.storage);
        setSelectValue('driveTypeInput', data.drive_type || 'NVMe M.2 SSD');
        modal.style.display='flex';
    } catch (e) { toast(e.message); document.getElementById('lookupModel').textContent='Not found'; document.getElementById('lookupSpecs').textContent='-'; }
    scanInput.value='';
});
document.getElementById('cancelSpec').onclick = () => { modal.style.display='none'; pendingItem=null; scanInput.focus(); };
document.getElementById('addSpec').onclick = () => {
    cart.push({...pendingItem, confirmed_ram:document.getElementById('ramInput').value, confirmed_storage:document.getElementById('storageInput').value, confirmed_drive_type:document.getElementById('driveTypeInput').value});
    modal.style.display='none'; pendingItem=null; renderCart(); scanInput.focus();
};
discount.onchange = totals;
payButton.onclick = async () => {
    payButton.disabled = true;
    try {
        const res = await fetch('{{ route('pos.checkout') }}', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf,'Accept':'application/json'}, body:JSON.stringify({payment_method:document.getElementById('paymentMethod').value, discount_campaign_id:discount.value || null, items:cart.map(i => ({serial_number:i.serial_number, confirmed_ram:i.confirmed_ram, confirmed_storage:i.confirmed_storage, confirmed_drive_type:i.confirmed_drive_type}))})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Checkout failed.');
        window.location = data.redirect;
    } catch (e) { toast(e.message); payButton.disabled = false; }
};
renderCart();
</script>
@endsection
