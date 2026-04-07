<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return redirect('/index.html');
});

Route::get('/healthz', function () {
    return response()->json([
        'ok' => true,
        'php' => PHP_VERSION,
        'app_env' => env('APP_ENV'),
        'app_debug' => env('APP_DEBUG'),
        'app_url' => env('APP_URL'),
    ]);
});

Route::get('/debug-db', function () {
    try {
        DB::connection()->getPdo();

        return response()->json([
            'ok' => true,
            'db_connection' => config('database.default'),
            'db_database' => config('database.connections.pgsql.database') ?? null,
            'message' => 'DB connected',
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'db_connection' => config('database.default'),
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::get('/ping', function () {
    return 'pong';
});

Route::get('/env-check', function () {
    return response()->json([
        'app_env' => env('APP_ENV'),
        'app_debug' => env('APP_DEBUG'),
        'app_url' => env('APP_URL'),
        'db_default' => config('database.default'),
        'db_host' => config('database.connections.pgsql.host'),
        'db_port' => config('database.connections.pgsql.port'),
        'db_database' => config('database.connections.pgsql.database'),
        'db_username' => config('database.connections.pgsql.username'),
    ]);
});
