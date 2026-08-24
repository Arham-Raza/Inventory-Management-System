@extends('layouts.app')
@section('title', 'Barcode Labels - ECS POS')
@section('content')
<div class="topline no-print">
    <div><h1 class="h1">Barcode Labels</h1><p class="sub">Print Code 128 stickers. The barcode value is the laptop serial number.</p></div>
    <button class="btn primary" onclick="window.print()">Print Sheet</button>
</div>
@include('barcodes.partials.sheet', ['items' => $items, 'generator' => $generator])
@endsection
