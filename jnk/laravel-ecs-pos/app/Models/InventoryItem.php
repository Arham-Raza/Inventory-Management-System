<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    protected $fillable = [
        'serial_number',
        'model_name',
        'processor',
        'gpu',
        'ram',
        'storage',
        'drive_type',
        'purchase_cost',
        'retail_price',
        'status',
    ];

    public function scopeAvailable($query)
    {
        return $query->where('status', 'AVAILABLE');
    }
}
