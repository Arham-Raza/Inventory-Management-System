@extends('layouts.app')
@section('title', 'Accounting - ECS POS')
@section('content')
<div class="topline"><div><h1 class="h1">Accounting</h1><p class="sub">Revenue, COGS, and gross profit.</p></div></div>
<div class="grid grid-3">
    <div class="card"><div class="label">Revenue</div><div class="metric">{{ \App\Support\Money::format($revenue) }}</div></div>
    <div class="card"><div class="label">COGS</div><div class="metric">{{ \App\Support\Money::format($cogs) }}</div></div>
    <div class="card"><div class="label">Gross Profit</div><div class="metric">{{ \App\Support\Money::format($profit) }}</div></div>
</div>
<div style="height:18px"></div>
<div class="table-wrap">
<table>
    <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Discount</th><th>Payment</th><th class="right">Total</th></tr></thead>
    <tbody>
    @forelse($orders as $order)
        <tr><td><a href="{{ route('orders.receipt', $order) }}">{{ $order->order_number }}</a></td><td>{{ $order->created_at->format('Y-m-d H:i') }}</td><td>{{ $order->items->count() }}</td><td>{{ optional($order->discount)->name ?? '-' }}</td><td>{{ $order->payment_method }}</td><td class="right">{{ \App\Support\Money::format($order->total_amount) }}</td></tr>
    @empty
        <tr><td colspan="6">No completed orders.</td></tr>
    @endforelse
    </tbody>
</table>
</div>
@endsection
