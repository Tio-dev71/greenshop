<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->bigIncrements('ProductID'); // Theo ERD
            $table->string('ProductName')->unique(); // Theo ERD (U)
            $table->text('Description')->nullable(); // text thay vì varchar(255)
            $table->decimal('Price', 10, 2); // Theo ERD (N), dùng decimal cho tiền
            $table->integer('Quantity')->default(0); // Theo ERD
            $table->string('Category')->nullable(); // Theo ERD
            $table->string('Image')->nullable(); // Theo ERD
            $table->decimal('Discount', 5, 2)->default(0.00); // Theo ERD (N), sửa thành decimal
            $table->timestamps(); // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
