<?php

namespace Database\Seeders;

use App\Models\DiscountCampaign;
use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $users = [
            ['name' => 'Admin', 'email' => 'admin@ecs.com', 'password' => 'admin123', 'role' => 'SUPER_ADMIN'],
            ['name' => 'Manager', 'email' => 'manager@ecs.com', 'password' => 'manager123', 'role' => 'MANAGER'],
            ['name' => 'Data Entry', 'email' => 'dataentry@ecs.com', 'password' => 'dataentry123', 'role' => 'DATA_ENTRY'],
            ['name' => 'Cashier', 'email' => 'cashier@ecs.com', 'password' => 'cashier123', 'role' => 'CASHIER'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make($user['password']),
                    'role' => $user['role'],
                ]
            );
        }

        $items = [
            ['serial_number' => 'TEST-AVAIL-001', 'model_name' => 'Dell Latitude 7420', 'processor' => 'Intel Core i7-1165G7', 'gpu' => 'Intel Iris Xe', 'ram' => '16GB DDR4', 'storage' => '512GB', 'drive_type' => 'NVMe M.2 SSD', 'purchase_cost' => 118000, 'retail_price' => 150000, 'status' => 'AVAILABLE'],
            ['serial_number' => 'TEST-DISC-001', 'model_name' => 'HP EliteBook 840 G8', 'processor' => 'Intel Core i5-1135G7', 'gpu' => 'Intel Iris Xe', 'ram' => '8GB DDR4', 'storage' => '256GB', 'drive_type' => 'NVMe M.2 SSD', 'purchase_cost' => 76000, 'retail_price' => 100000, 'status' => 'AVAILABLE'],
            ['serial_number' => 'TEST-SOLD-001', 'model_name' => 'Lenovo ThinkPad T480', 'processor' => 'Intel Core i5-8350U', 'gpu' => 'Intel UHD 620', 'ram' => '8GB DDR4', 'storage' => '256GB', 'drive_type' => 'SATA SSD', 'purchase_cost' => 52000, 'retail_price' => 70000, 'status' => 'SOLD'],
        ];

        foreach ($items as $item) {
            InventoryItem::updateOrCreate(['serial_number' => $item['serial_number']], $item);
        }

        DiscountCampaign::updateOrCreate(
            ['name' => 'Test 20% Off'],
            ['type' => 'PERCENTAGE', 'value' => 20, 'is_active' => true]
        );
    }
}
