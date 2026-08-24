@extends('layouts.app')
@section('title', 'Barcode Label - ECS POS')
@section('content')
<div class="topline no-print">
    <div><h1 class="h1">Barcode Label</h1><p class="sub">{{ $items->first()->serial_number }}</p></div>
    <button class="btn primary" onclick="window.print()">Print Label</button>
</div>
@include('barcodes.partials.sheet', ['items' => $items, 'generator' => $generator])
@endsection
