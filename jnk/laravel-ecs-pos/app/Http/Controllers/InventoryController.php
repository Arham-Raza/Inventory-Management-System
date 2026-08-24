<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        return view('inventory.index', [
            'items' => InventoryItem::latest()->paginate(50),
            'availableCount' => InventoryItem::available()->count(),
            'totalCount' => InventoryItem::count(),
            'availableCost' => InventoryItem::available()->sum('purchase_cost'),
        ]);
    }

    public function create()
    {
        return view('inventory.create', [
            'ramOptions' => ['4GB DDR4', '8GB DDR4', '16GB DDR4', '32GB DDR4', '8GB DDR5', '16GB DDR5', '32GB DDR5', '64GB DDR5'],
            'storageOptions' => ['128GB', '256GB', '512GB', '1TB', '2TB', '4TB'],
            'driveTypeOptions' => ['NVMe M.2 SSD', 'M.2 SATA SSD', '2.5-inch SATA SSD', '2.5-inch HDD', 'Hybrid SSHD'],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'serial_number' => ['required', 'string', 'max:255', 'unique:inventory_items,serial_number'],
            'model_name' => ['required', 'string', 'max:255'],
            'processor' => ['required', 'string', 'max:255'],
            'gpu' => ['required', 'string', 'max:255'],
            'ram' => ['required', 'string', 'max:255'],
            'storage' => ['required', 'string', 'max:255'],
            'drive_type' => ['required', 'string', 'max:255'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'retail_price' => ['required', 'numeric', 'min:0'],
        ]);

        $data['status'] = 'AVAILABLE';
        InventoryItem::create($data);

        return redirect()->route('data-entry.index')->with('status', 'Inventory unit received.');
    }
}
