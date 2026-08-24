@extends('layouts.app')
@section('title', 'Inventory - ECS POS')
@section('content')
<div class="topline">
    <div><h1 class="h1">Inventory Ledger</h1><p class="sub">Every physical laptop tracked by serial number.</p></div>
    <div class="action-row"><a class="btn light" href="{{ route('barcodes.index') }}">Print Labels</a><a class="btn primary" href="{{ route('data-entry.index') }}">Receive Stock</a></div>
</div>
<div class="grid grid-3">
    <div class="card"><div class="label">Total Units</div><div class="metric">{{ $totalCount }}</div></div>
    <div class="card"><div class="label">Available</div><div class="metric">{{ $availableCount }}</div></div>
    <div class="card"><div class="label">Available Cost Value</div><div class="metric">{{ \App\Support\Money::format($availableCost) }}</div></div>
</div>
<div style="height:18px"></div>
<div class="table-wrap">
<table>
    <thead><tr><th>Serial</th><th>Model</th><th>CPU</th><th>GPU</th><th>RAM</th><th>Storage</th><th>Drive</th><th class="right">Cost</th><th class="right">Retail</th><th>Status</th><th></th></tr></thead>
    <tbody>
    @forelse($items as $item)
        <tr>
            <td><strong>{{ $item->serial_number }}</strong></td>
            <td>{{ $item->model_name }}</td>
            <td>{{ $item->processor }}</td>
            <td>{{ $item->gpu }}</td>
            <td>{{ $item->ram }}</td>
            <td>{{ $item->storage }}</td>
            <td>{{ $item->drive_type }}</td>
            <td class="right">{{ \App\Support\Money::format($item->purchase_cost) }}</td>
            <td class="right">{{ \App\Support\Money::format($item->retail_price) }}</td>
            <td><span class="chip {{ $item->status === 'AVAILABLE' ? 'ok' : 'sold' }}">{{ $item->status }}</span></td>
            <td><a class="btn light" href="{{ route('barcodes.show', $item) }}">Label</a></td>
        </tr>
    @empty
        <tr><td colspan="11">No inventory yet.</td></tr>
    @endforelse
    </tbody>
</table>
</div>
<div style="margin-top:14px">{{ $items->links() }}</div>
@endsection
