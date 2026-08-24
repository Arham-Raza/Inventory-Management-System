<?php

namespace App\Http\Controllers;

use App\Models\Order;

class AccountingController extends Controller
{
    public function index()
    {
        $orders = Order::with(['items', 'discount'])->latest()->get();
        $revenue = $orders->sum('total_amount');
        $cogs = $orders->flatMap->items->sum(function ($item) {
            return optional($item->inventoryItem)->purchase_cost ?? 0;
        });

        return view('accounting.index', [
            'orders' => $orders,
            'revenue' => $revenue,
            'cogs' => $cogs,
            'profit' => $revenue - $cogs,
        ]);
    }
}
