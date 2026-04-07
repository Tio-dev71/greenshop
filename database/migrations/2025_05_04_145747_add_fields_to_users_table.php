<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Thêm các cột mới từ ERD vào sau cột 'email' hoặc 'password' chẳng hạn
            $table->string('FullName')->after('name')->nullable(); // Thêm FullName, cho phép null nếu name đã có
            $table->string('UserName')->unique()->after('FullName')->nullable(); // Thêm UserName, unique, cho phép null
            $table->integer('Status')->default(1)->after('password'); // Thêm Status, mặc định là 1 (Active?)
            $table->integer('Role')->default(0)->after('Status'); // Thêm Role, mặc định là 0 (User?)

            // Đảm bảo cột 'name' đã có từ migration gốc (nếu không cần thì xóa)
            // Đảm bảo cột 'email' đã unique từ migration gốc
            // Đảm bảo cột 'password' đã có

            // Sửa đổi cột 'address' đã thêm trước đó nếu cần (ví dụ cho phép null)
            // $table->string('address')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Xóa các cột đã thêm (quan trọng để có thể rollback)
            $table->dropColumn(['FullName', 'UserName', 'Status', 'Role']);
        });
    }
};
