@echo off
setlocal
cd /d %~dp0
where php >nul 2>nul || (echo [LOI] Chua co PHP trong PATH.& pause & exit /b 1)
where composer >nul 2>nul || (echo [LOI] Chua co Composer trong PATH.& pause & exit /b 1)
if not exist .env copy .env.example .env
if not exist database\database.sqlite type nul > database\database.sqlite
composer install
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
