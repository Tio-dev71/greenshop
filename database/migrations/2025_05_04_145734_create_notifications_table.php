<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->bigIncrements('NotificationID'); // Theo ERD
            $table->unsignedBigInteger('UserID'); // Theo ERD (FK)
            $table->string('Title')->nullable(); // Sửa thành string
            $table->text('Description'); // Theo ERD (N), sửa thành text
            $table->timestamp('Date')->nullable(); // Theo ERD (time(7) -> timestamp)
            $table->timestamps();

            // Khai báo khóa ngoại
            $table->foreign('UserID')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
