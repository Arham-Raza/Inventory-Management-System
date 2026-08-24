@extends('layouts.app')
@section('title', 'Discounts - ECS POS')
@section('content')
<div class="topline"><div><h1 class="h1">Discount Campaigns</h1><p class="sub">Active campaigns are available at the POS.</p></div></div>
<form class="card" method="post" action="{{ route('discounts.store') }}">
    @csrf
    <div class="grid grid-4">
        <div class="field"><label>Name</label><input class="input" name="name" required></div>
        <div class="field"><label>Type</label><select class="select" name="type"><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed Amount</option></select></div>
        <div class="field"><label>Value</label><input class="input" name="value" type="number" step="0.01" required></div>
        <div class="field"><label>Active</label><select class="select" name="is_active"><option value="1">Active</option><option value="0">Inactive</option></select></div>
    </div>
    <button class="btn primary">Create Campaign</button>
</form>
<div style="height:18px"></div>
<div class="table-wrap">
<table>
    <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Status</th><th></th></tr></thead>
    <tbody>
    @forelse($discounts as $discount)
        <tr><td>{{ $discount->name }}</td><td>{{ $discount->type }}</td><td>{{ $discount->type === 'PERCENTAGE' ? $discount->value.'%' : \App\Support\Money::format($discount->value) }}</td><td>{{ $discount->is_active ? 'Active' : 'Inactive' }}</td><td class="right"><form method="post" action="{{ route('discounts.toggle', $discount) }}">@csrf<button class="btn light">Toggle</button></form></td></tr>
    @empty
        <tr><td colspan="5">No discounts configured.</td></tr>
    @endforelse
    </tbody>
</table>
</div>
@endsection
