<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
         $middleware->validateCsrfTokens(except: [
            // ---- THAY ĐỔI Ở ĐÂY ----
            'api/*' // Sử dụng wildcard để loại trừ tất cả các route bắt đầu bằng api/
            // 'api/login',  // Comment out hoặc xóa dòng cũ
            // 'api/signup' // Comment out hoặc xóa dòng cũ
            // ---- KẾT THÚC THAY ĐỔI ----
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
