<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_product', function (Blueprint $table) {
            $table->unsignedBigInteger('OrderID');
            $table->unsignedBigInteger('ProductID');
            $table->integer('Quantity');
            $table->decimal('Price', 10, 2); // Giá sản phẩm tại thời điểm đặt hàng
            $table->decimal('Discount', 5, 2)->default(0.00); // << CỘT NÀY PHẢI CÓ
            // Hoặc tên cột khác nếu bạn đặt tên khác, ví dụ: DiscountApplied

            $table->foreign('OrderID')->references('OrderID')->on('orders')->onDelete('cascade');
            $table->foreign('ProductID')->references('ProductID')->on('products')->onDelete('cascade');
            $table->primary(['OrderID', 'ProductID']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_product');
    }
};
