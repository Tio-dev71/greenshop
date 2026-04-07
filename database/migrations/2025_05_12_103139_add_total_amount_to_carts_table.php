<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            // Thêm cột TotalAmount sau cột UserID, kiểu decimal, cho phép null, mặc định là 0
            $table->decimal('TotalAmount', 12, 2)->nullable()->default(0.00)->after('UserID');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            // Xóa cột nếu rollback migration
            $table->dropColumn('TotalAmount');
        });
    }
};
