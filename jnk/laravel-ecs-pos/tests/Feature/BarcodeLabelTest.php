<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BarcodeLabelTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_print_code_128_barcode_labels()
    {
        $admin = User::factory()->create([
            'password' => Hash::make('password'),
            'role' => 'SUPER_ADMIN',
        ]);

        InventoryItem::create([
            'serial_number' => 'LBL-001',
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

        $this->actingAs($admin)
            ->get(route('barcodes.index'))
            ->assertOk()
            ->assertSee('LBL-001')
            ->assertSee('<svg', false);
    }
}
