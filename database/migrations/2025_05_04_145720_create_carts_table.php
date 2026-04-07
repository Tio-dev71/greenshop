<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->bigIncrements('CartID'); // Theo ERD
            $table->unsignedBigInteger('UserID')->unique(); // Theo ERD (FK, Unique vì mỗi user thường chỉ có 1 giỏ hàng)
            $table->timestamps();

            // Khai báo khóa ngoại
            $table->foreign('UserID')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
