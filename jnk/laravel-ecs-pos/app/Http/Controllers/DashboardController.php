<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\Order;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $todayStart = now()->startOfDay();

        return view('dashboard', [
            'availableStock' => InventoryItem::available()->count(),
            'totalItems' => InventoryItem::count(),
            'lifetimeRevenue' => Order::sum('total_amount'),
            'todayRevenue' => Order::where('created_at', '>=', $todayStart)->sum('total_amount'),
            'todayOrders' => Order::where('created_at', '>=', $todayStart)->count(),
            'recentOrders' => Order::with(['cashier', 'items', 'discount'])->latest()->limit(8)->get(),
        ]);
    }
}
