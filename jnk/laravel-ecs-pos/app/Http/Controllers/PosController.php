<?php

namespace App\Http\Controllers;

use App\Models\DiscountCampaign;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    public function index()
    {
        return view('pos.index', [
            'discounts' => DiscountCampaign::active()->latest()->get(),
            'ramOptions' => ['4GB DDR4', '8GB DDR4', '16GB DDR4', '32GB DDR4', '8GB DDR5', '16GB DDR5', '32GB DDR5', '64GB DDR5'],
            'storageOptions' => ['128GB', '256GB', '512GB', '1TB', '2TB', '4TB'],
            'driveTypeOptions' => ['NVMe M.2 SSD', 'M.2 SATA SSD', '2.5-inch SATA SSD', '2.5-inch HDD', 'Hybrid SSHD'],
        ]);
    }

    public function lookup(Request $request)
    {
        $data = $request->validate([
            'serial_number' => ['required', 'string'],
        ]);

        $item = InventoryItem::where('serial_number', $data['serial_number'])->first();

        if (! $item) {
            return response()->json(['message' => 'No laptop found for that serial number.'], 404);
        }

        if ($item->status !== 'AVAILABLE') {
            return response()->json(['message' => "{$item->model_name} is already {$item->status}."], 409);
        }

        return response()->json($item);
    }

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'payment_method' => ['required', 'in:CASH,CARD,TRANSFER'],
            'discount_campaign_id' => ['nullable', 'exists:discount_campaigns,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.serial_number' => ['required', 'string'],
            'items.*.confirmed_ram' => ['required', 'string', 'max:255'],
            'items.*.confirmed_storage' => ['required', 'string', 'max:255'],
            'items.*.confirmed_drive_type' => ['required', 'string', 'max:255'],
        ]);

        $serials = collect($data['items'])->pluck('serial_number');

        if ($serials->duplicates()->isNotEmpty()) {
            return response()->json(['message' => 'The same serial number cannot be sold twice.'], 422);
        }

        try {
            $order = DB::transaction(function () use ($data) {
                $inputBySerial = collect($data['items'])->keyBy('serial_number');
                $items = InventoryItem::whereIn('serial_number', $inputBySerial->keys())
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('serial_number');

                foreach ($inputBySerial as $serial => $input) {
                    if (! isset($items[$serial])) {
                        throw new \RuntimeException("Serial {$serial} no longer exists.");
                    }

                    if ($items[$serial]->status !== 'AVAILABLE') {
                        throw new \RuntimeException("Serial {$serial} was already sold by another cashier.");
                    }
                }

                $discount = null;
                if (! empty($data['discount_campaign_id'])) {
                    $discount = DiscountCampaign::active()->find($data['discount_campaign_id']);
                }

                $totals = Money::totals($items->sum('retail_price'), $discount);

                $order = Order::create([
                    'order_number' => 'ECS-' . now()->format('Ymd-His') . '-' . random_int(100, 999),
                    'cashier_id' => auth()->id(),
                    'discount_campaign_id' => optional($discount)->id,
                    'payment_method' => $data['payment_method'],
                    'subtotal' => $totals['subtotal'],
                    'discount_amount' => $totals['discount_amount'],
                    'tax_amount' => $totals['tax_amount'],
                    'total_amount' => $totals['total_amount'],
                ]);

                foreach ($items as $serial => $item) {
                    $confirmed = $inputBySerial[$serial];

                    $order->items()->create([
                        'inventory_item_id' => $item->id,
                        'serial_number' => $item->serial_number,
                        'model_name' => $item->model_name,
                        'processor' => $item->processor,
                        'gpu' => $item->gpu,
                        'confirmed_ram' => $confirmed['confirmed_ram'],
                        'confirmed_storage' => $confirmed['confirmed_storage'],
                        'confirmed_drive_type' => $confirmed['confirmed_drive_type'],
                        'price_at_sale' => $item->retail_price,
                    ]);

                    $updated = InventoryItem::whereKey($item->id)
                        ->where('status', 'AVAILABLE')
                        ->update([
                            'status' => 'SOLD',
                            'ram' => $confirmed['confirmed_ram'],
                            'storage' => $confirmed['confirmed_storage'],
                            'drive_type' => $confirmed['confirmed_drive_type'],
                        ]);

                    if ($updated !== 1) {
                        throw new \RuntimeException("Serial {$serial} was already sold by another cashier.");
                    }
                }

                return $order->load(['items', 'cashier', 'discount']);
            });

            return response()->json([
                'message' => 'Order completed.',
                'redirect' => route('orders.receipt', ['order' => $order, 'autoprint' => 1]),
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json(['message' => $exception->getMessage()], 409);
        }
    }

    public function receipt(Order $order)
    {
        abort_unless($order->cashier_id === auth()->id() || auth()->user()->canAccessAdminArea(), 403);

        return view('pos.receipt', [
            'order' => $order->load(['items', 'cashier', 'discount']),
        ]);
    }
}
