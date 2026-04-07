<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_product', function (Blueprint $table) {
            $table->unsignedBigInteger('CartID'); // Theo ERD (PK, FK)
            $table->unsignedBigInteger('ProductID'); // Theo ERD (PK, FK)
            $table->integer('Quantity'); // Theo ERD

            // Khai báo khóa ngoại
            $table->foreign('CartID')->references('CartID')->on('carts')->onDelete('cascade');
            $table->foreign('ProductID')->references('ProductID')->on('products')->onDelete('cascade');

            // Khai báo khóa chính tổng hợp
            $table->primary(['CartID', 'ProductID']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_product');
    }
};
