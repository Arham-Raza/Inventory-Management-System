@extends('layouts.app')
@section('title', 'Receive Stock - ECS POS')
@section('content')
<div class="topline">
    <div><h1 class="h1">Receive Stock</h1><p class="sub">Create one serialized laptop record. The serial number is the barcode value.</p></div>
    <a class="btn light" href="{{ route('barcodes.index') }}">Print Labels</a>
</div>
<form class="card" method="post" action="{{ route('data-entry.store') }}" style="max-width:1060px">
    @csrf
    <div class="grid grid-2">
        <div class="field"><label>Serial Number / Barcode</label><input class="input" name="serial_number" value="{{ old('serial_number') }}" placeholder="e.g. ECS-D7420-0001" required></div>
        <div class="field"><label>Model Name</label><input class="input" name="model_name" value="{{ old('model_name') }}" placeholder="Dell Latitude 7420" required></div>
        <div class="field"><label>Processor</label><input class="input" name="processor" value="{{ old('processor') }}" placeholder="Intel Core i7-1165G7" required></div>
        <div class="field"><label>GPU</label><input class="input" name="gpu" value="{{ old('gpu') }}" placeholder="Intel Iris Xe / NVIDIA RTX 3050" required></div>
        <div class="field">
            <label>RAM Variant</label>
            <select class="select" name="ram" required>
                @foreach($ramOptions as $option)<option value="{{ $option }}" @selected(old('ram') === $option)>{{ $option }}</option>@endforeach
            </select>
        </div>
        <div class="field">
            <label>Storage Capacity</label>
            <select class="select" name="storage" required>
                @foreach($storageOptions as $option)<option value="{{ $option }}" @selected(old('storage') === $option)>{{ $option }}</option>@endforeach
            </select>
        </div>
        <div class="field">
            <label>Drive Type</label>
            <select class="select" name="drive_type" required>
                @foreach($driveTypeOptions as $option)<option value="{{ $option }}" @selected(old('drive_type') === $option)>{{ $option }}</option>@endforeach
            </select>
        </div>
        <div class="field"><label>Purchase Cost</label><input class="input" name="purchase_cost" type="number" step="0.01" value="{{ old('purchase_cost') }}" required></div>
        <div class="field"><label>Retail Price</label><input class="input" name="retail_price" type="number" step="0.01" value="{{ old('retail_price') }}" required></div>
    </div>
    <button class="btn primary big">Save Unit</button>
</form>
@endsection
