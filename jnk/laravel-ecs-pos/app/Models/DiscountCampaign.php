<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCampaign extends Model
{
    protected $fillable = ['name', 'type', 'value', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
