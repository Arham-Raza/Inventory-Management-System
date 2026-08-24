<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('drive_type')->default('NVMe M.2 SSD')->after('storage');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('confirmed_drive_type')->default('NVMe M.2 SSD')->after('confirmed_storage');
        });
    }

    public function down()
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('confirmed_drive_type');
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn('drive_type');
        });
    }
};
