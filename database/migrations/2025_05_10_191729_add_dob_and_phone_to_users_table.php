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
        Schema::table('users', function (Blueprint $table) {
            // Thêm cột DateOfBirth, kiểu DATE, cho phép NULL
            // Bạn có thể đặt sau một cột cụ thể nếu muốn, ví dụ: $table->date('DateOfBirth')->nullable()->after('email');
            $table->date('DateOfBirth')->nullable();

            // Thêm cột PhoneNumber, kiểu VARCHAR(20) (điều chỉnh độ dài nếu cần), cho phép NULL, có thể là duy nhất nếu muốn
            // Ví dụ: $table->string('PhoneNumber', 20)->nullable()->unique()->after('DateOfBirth');
            $table->string('PhoneNumber', 20)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Xóa cột nếu rollback migration
            $table->dropColumn('DateOfBirth');
            $table->dropColumn('PhoneNumber');
        });
    }
};
