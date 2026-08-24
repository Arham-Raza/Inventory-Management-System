<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'inventory_item_id',
        'serial_number',
        'model_name',
        'processor',
        'gpu',
        'confirmed_ram',
        'confirmed_storage',
        'confirmed_drive_type',
        'price_at_sale',
    ];

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
