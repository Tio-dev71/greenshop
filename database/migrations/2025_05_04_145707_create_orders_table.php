<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->bigIncrements('OrderID'); // Theo ERD
            $table->unsignedBigInteger('UserID'); // Theo ERD (FK)
            $table->unsignedBigInteger('AddressID'); // Theo ERD (FK)
            $table->decimal('TotalAmount', 12, 2); // Theo ERD (sửa thành decimal)
            $table->string('Payment')->nullable(); // Theo ERD
            $table->string('Status'); // Theo ERD
            $table->timestamps();

            // Khai báo khóa ngoại
            $table->foreign('UserID')->references('id')->on('users')->onDelete('cascade');
            // Giả sử AddressID tham chiếu đến PK của user_addresses
            $table->foreign('AddressID')->references('AddressID')->on('user_addresses')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
