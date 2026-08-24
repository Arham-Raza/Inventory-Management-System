<?php

namespace App\Support;

class Money
{
    public const TAX_RATE_PERCENT = 18;

    public static function toPaisa($rupees)
    {
        return (int) round(((float) $rupees) * 100);
    }

    public static function fromPaisa($paisa)
    {
        return round($paisa / 100, 2);
    }

    public static function totals($subtotal, $discount = null)
    {
        $subtotalPaisa = self::toPaisa($subtotal);
        $discountPaisa = 0;

        if ($discount) {
            if ($discount->type === 'PERCENTAGE') {
                $discountPaisa = (int) round($subtotalPaisa * ((float) $discount->value) / 100);
            } else {
                $discountPaisa = self::toPaisa($discount->value);
            }
        }

        $discountPaisa = min($discountPaisa, $subtotalPaisa);
        $discountedSubtotalPaisa = max(0, $subtotalPaisa - $discountPaisa);
        $taxPaisa = (int) round($discountedSubtotalPaisa * self::TAX_RATE_PERCENT / 100);
        $totalPaisa = $discountedSubtotalPaisa + $taxPaisa;

        return [
            'subtotal' => self::fromPaisa($subtotalPaisa),
            'discount_amount' => self::fromPaisa($discountPaisa),
            'tax_amount' => self::fromPaisa($taxPaisa),
            'total_amount' => self::fromPaisa($totalPaisa),
        ];
    }

    public static function format($amount)
    {
        return 'Rs. ' . number_format((float) $amount, 2);
    }
}
