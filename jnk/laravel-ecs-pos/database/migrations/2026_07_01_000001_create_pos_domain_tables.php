<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('email')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('serial_number')->unique();
            $table->string('model_name');
            $table->string('processor');
            $table->string('gpu');
            $table->string('ram');
            $table->string('storage');
            $table->decimal('purchase_cost', 12, 2);
            $table->decimal('retail_price', 12, 2);
            $table->enum('status', ['AVAILABLE', 'SOLD', 'RETURNED'])->default('AVAILABLE')->index();
            $table->timestamps();
        });

        Schema::create('discount_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['PERCENTAGE', 'FIXED']);
            $table->decimal('value', 12, 2);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('cashier_id')->constrained('users');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('discount_campaign_id')->nullable()->constrained('discount_campaigns')->nullOnDelete();
            $table->enum('payment_method', ['CASH', 'CARD', 'TRANSFER']);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->nullOnDelete();
            $table->string('serial_number');
            $table->string('model_name');
            $table->string('processor');
            $table->string('gpu');
            $table->string('confirmed_ram');
            $table->string('confirmed_storage');
            $table->decimal('price_at_sale', 12, 2);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('discount_campaigns');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('customers');
    }
};
