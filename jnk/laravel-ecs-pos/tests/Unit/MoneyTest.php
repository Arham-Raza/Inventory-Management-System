<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_twenty_percent_discount_totals_are_integer_safe()
    {
        $discount = (object) ['type' => 'PERCENTAGE', 'value' => 20];
        $totals = Money::totals(100000, $discount);

        $this->assertSame(100000.0, $totals['subtotal']);
        $this->assertSame(20000.0, $totals['discount_amount']);
        $this->assertSame(14400.0, $totals['tax_amount']);
        $this->assertSame(94400.0, $totals['total_amount']);
    }
}
