<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Picqer\Barcode\BarcodeGeneratorSVG;

class BarcodeLabelController extends Controller
{
    public function index()
    {
        $items = InventoryItem::latest()->get();
        $generator = new BarcodeGeneratorSVG();

        return view('barcodes.index', [
            'items' => $items,
            'generator' => $generator,
        ]);
    }

    public function show(InventoryItem $item)
    {
        $generator = new BarcodeGeneratorSVG();

        return view('barcodes.sheet', [
            'items' => collect([$item]),
            'generator' => $generator,
        ]);
    }
}
