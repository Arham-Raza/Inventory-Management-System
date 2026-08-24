<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'cashier_id',
        'customer_id',
        'discount_campaign_id',
        'payment_method',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
    ];

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function discount()
    {
        return $this->belongsTo(DiscountCampaign::class, 'discount_campaign_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
