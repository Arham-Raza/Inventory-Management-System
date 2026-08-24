@extends('layouts.app')
@section('title', 'Receipt '.$order->order_number)
@section('content')
<div class="topline no-print"><div><h1 class="h1">Receipt</h1><p class="sub">{{ $order->order_number }}</p></div><button class="btn primary" onclick="window.print()">Print</button></div>
<div class="card receipt" style="max-width:420px">
    <h2 style="text-align:center;margin:0">Easy Connect Solutions</h2>
    <p style="text-align:center;margin:6px 0 14px">Warranty Receipt<br>{{ $order->created_at->format('Y-m-d H:i') }}</p>
    <p><strong>Order:</strong> {{ $order->order_number }}<br><strong>Cashier:</strong> {{ $order->cashier->name }}<br><strong>Payment:</strong> {{ $order->payment_method }}</p>
    <hr>
    @foreach($order->items as $item)
        <p>
            <strong>{{ $item->model_name }}</strong><br>
            Serial: {{ $item->serial_number }}<br>
            CPU: {{ $item->processor }}<br>
            GPU: {{ $item->gpu }}<br>
            RAM: {{ $item->confirmed_ram }}<br>
            Storage: {{ $item->confirmed_storage }}<br>
            Drive: {{ $item->confirmed_drive_type }}<br>
            Price: {{ \App\Support\Money::format($item->price_at_sale) }}
        </p>
    @endforeach
    <hr>
    <p>
        Subtotal: {{ \App\Support\Money::format($order->subtotal) }}<br>
        Discount: {{ \App\Support\Money::format($order->discount_amount) }}<br>
        GST 18%: {{ \App\Support\Money::format($order->tax_amount) }}<br>
        <strong>Total: {{ \App\Support\Money::format($order->total_amount) }}</strong>
    </p>
    <p style="font-size:12px">This receipt is the warranty document for the serialized unit(s) listed above. Warranty applies to the exact serial number and confirmed specifications printed here.</p>
</div>
@if(request()->boolean('autoprint'))
<script>
window.addEventListener('load', () => setTimeout(() => window.print(), 450));
</script>
@endif
@endsection
