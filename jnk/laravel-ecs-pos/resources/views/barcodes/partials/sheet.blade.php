<div class="label-sheet">
@foreach($items as $item)
    <div class="barcode-label">
        {!! $generator->getBarcode($item->serial_number, \Picqer\Barcode\BarcodeGeneratorSVG::TYPE_CODE_128, 1.7, 46) !!}
        <div class="label-serial">{{ $item->serial_number }}</div>
        <div class="label-model">{{ $item->model_name }}</div>
        <div style="font-size:11px;color:#475569">{{ $item->processor }} / {{ $item->ram }} / {{ $item->storage }} {{ $item->drive_type }}</div>
    </div>
@endforeach
</div>
