<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_addresses', function (Blueprint $table) {
            $table->bigIncrements('AddressID'); // Theo ERD
            $table->unsignedBigInteger('UserID'); // Theo ERD (FK)
            $table->string('CustomerName'); // Theo ERD
            $table->string('PhoneNumber'); // Theo ERD (sửa thành string)
            $table->string('Street'); // Theo ERD
            $table->string('Ward'); // Theo ERD
            $table->string('District'); // Theo ERD
            $table->timestamps();

            // Khai báo khóa ngoại tới bảng users (giả sử bảng users dùng PK là 'id')
            $table->foreign('UserID')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
