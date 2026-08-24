@extends('layouts.app')
@section('title', 'Dashboard - ECS POS')
@section('content')
<div class="topline">
    <div><h1 class="h1">Dashboard</h1><p class="sub">{{ now()->format('l, F j, Y') }}</p></div>
    <a class="btn primary" href="{{ route('pos.index') }}">Open POS</a>
</div>
<div class="grid grid-4">
    <div class="card"><div class="label">Today Revenue</div><div class="metric">{{ \App\Support\Money::format($todayRevenue) }}</div><div class="label">{{ $todayOrders }} orders today</div></div>
    <div class="card"><div class="label">Lifetime Revenue</div><div class="metric">{{ \App\Support\Money::format($lifetimeRevenue) }}</div></div>
    <div class="card"><div class="label">Available Stock</div><div class="metric">{{ $availableStock }}</div><div class="label">of {{ $totalItems }} units</div></div>
    <div class="card"><div class="label">Units Sold</div><div class="metric">{{ max(0, $totalItems - $availableStock) }}</div></div>
</div>
<div style="height:18px"></div>
<div class="card">
    <h2 style="margin-top:0">Recent Transactions</h2>
    <div class="table-wrap">
    <table>
        <thead><tr><th>Order</th><th>Cashier</th><th>Items</th><th>Discount</th><th>Time</th><th class="right">Total</th></tr></thead>
        <tbody>
        @forelse($recentOrders as $order)
            <tr>
                <td><a href="{{ route('orders.receipt', $order) }}">{{ $order->order_number }}</a></td>
                <td>{{ $order->cashier->name }}</td>
                <td>{{ $order->items->count() }}</td>
                <td>{{ optional($order->discount)->name ?? '-' }}</td>
                <td>{{ $order->created_at->format('h:i A') }}</td>
                <td class="right">{{ \App\Support\Money::format($order->total_amount) }}</td>
            </tr>
        @empty
            <tr><td colspan="6">No transactions yet.</td></tr>
        @endforelse
        </tbody>
    </table>
    </div>
</div>
@endsection
