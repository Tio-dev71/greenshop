# Chạy dự án GreenFood trên Windows

## 1) Yêu cầu
- PHP 8.2 trở lên
- Composer

## 2) Chạy nhanh
Mở CMD trong thư mục dự án rồi chạy:

```bat
run-local.bat
```

## 3) Nếu muốn chạy thủ công
```bat
copy .env.example .env
if not exist database\database.sqlite type nul > database\database.sqlite
composer install
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
```

Sau đó mở:
- http://127.0.0.1:8000/index.html
- http://127.0.0.1:8000/Login.html
- http://127.0.0.1:8000/Signup.html

## 4) Ghi chú
- Mình đã đổi các API base cứng từ `http://localhost/GreenFood/public` sang `window.location.origin` để chạy đúng với `php artisan serve`.
- Nếu cần dữ liệu sản phẩm để test, bạn phải tự tạo user/admin và thêm sản phẩm sau khi chạy xong backend.
