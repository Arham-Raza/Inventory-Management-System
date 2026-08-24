<?php

namespace Tests\Feature;

use App\Models\DiscountCampaign;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PosCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cashier = User::updateOrCreate(
            ['email' => 'cashier@example.com'],
            [
                'name' => 'Cashier',
                'password' => Hash::make('password'),
                'role' => 'CASHIER',
            ]
        );
    }

    public function test_available_laptop_can_be_looked_up_for_spec_confirmation()
    {
        InventoryItem::create([
            'serial_number' => 'LAP-001',
            'model_name' => 'Dell Latitude',
            'processor' => 'Core i7',
            'gpu' => 'Intel Iris Xe',
            'ram' => '16GB DDR4',
            'storage' => '512GB',
            'drive_type' => 'NVMe M.2 SSD',
            'purchase_cost' => 100000,
            'retail_price' => 150000,
            'status' => 'AVAILABLE',
        ]);

        $this->actingAs($this->cashier)
            ->postJson(route('pos.lookup'), ['serial_number' => 'LAP-001'])
            ->assertOk()
            ->assertJsonPath('serial_number', 'LAP-001')
            ->assertJsonPath('status', 'AVAILABLE');
    }

    public function test_sold_laptop_lookup_is_blocked()
    {
        InventoryItem::create([
            'serial_number' => 'SOLD-001',
            'model_name' => 'ThinkPad',
            'processor' => 'Core i5',
            'gpu' => 'Intel UHD',
            'ram' => '8GB DDR4',
            'storage' => '256GB',
            'drive_type' => 'SATA SSD',
            'purchase_cost' => 50000,
            'retail_price' => 75000,
            'status' => 'SOLD',
        ]);

        $this->actingAs($this->cashier)
            ->postJson(route('pos.lookup'), ['serial_number' => 'SOLD-001'])
            ->assertStatus(409)
            ->assertJsonFragment(['message' => 'ThinkPad is already SOLD.']);
    }

    public function test_checkout_applies_twenty_percent_discount_and_sells_serial()
    {
        InventoryItem::create([
            'serial_number' => 'DISC-001',
            'model_name' => 'HP EliteBook',
            'processor' => 'Core i5',
            'gpu' => 'Intel Iris Xe',
            'ram' => '8GB DDR4',
            'storage' => '256GB',
            'drive_type' => 'NVMe M.2 SSD',
            'purchase_cost' => 70000,
            'retail_price' => 100000,
            'status' => 'AVAILABLE',
        ]);

        $discount = DiscountCampaign::create([
            'name' => '20% Off',
            'type' => 'PERCENTAGE',
            'value' => 20,
            'is_active' => true,
        ]);

        $this->actingAs($this->cashier)
            ->postJson(route('pos.checkout'), [
                'payment_method' => 'CASH',
                'discount_campaign_id' => $discount->id,
                'items' => [[
                    'serial_number' => 'DISC-001',
                    'confirmed_ram' => '16GB DDR4',
                    'confirmed_storage' => '512GB',
                    'confirmed_drive_type' => 'NVMe M.2 SSD',
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Order completed.');

        $order = Order::first();

        $this->assertEquals(100000.00, (float) $order->subtotal);
        $this->assertEquals(20000.00, (float) $order->discount_amount);
        $this->assertEquals(14400.00, (float) $order->tax_amount);
        $this->assertEquals(94400.00, (float) $order->total_amount);
        $this->assertDatabaseHas('inventory_items', [
            'serial_number' => 'DISC-001',
            'status' => 'SOLD',
            'ram' => '16GB DDR4',
            'storage' => '512GB',
            'drive_type' => 'NVMe M.2 SSD',
        ]);
        $this->assertDatabaseHas('order_items', [
            'serial_number' => 'DISC-001',
            'confirmed_ram' => '16GB DDR4',
            'confirmed_storage' => '512GB',
            'confirmed_drive_type' => 'NVMe M.2 SSD',
        ]);
    }
}
