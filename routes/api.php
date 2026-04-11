<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\UserAddressController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AdminRevenueController;
use App\Http\Middleware\CheckAdminRole; // Import middleware

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

//======================================================================
// PUBLIC ROUTES (Không cần xác thực)
//======================================================================
Route::post('/signup', [AuthController::class, 'signup'])->name('api.signup');
Route::post('/login', [AuthController::class, 'login'])->name('api.login');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('api.forgot-password');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('api.reset-password');

Route::prefix('products')->name('api.public.products.')->group(function () {
    Route::get('/', [ProductController::class, 'listPublicProducts'])->name('index'); // GET /api/products
    Route::get('/{product}', [ProductController::class, 'showPublicProductDetails'])->name('show'); // GET /api/products/{product}
});


//======================================================================
// AUTHENTICATED USER ROUTES (Cần đăng nhập, không cần là admin)
//======================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/user', function (Request $request) {
        return $request->user();
    })->name('api.user.profile');

    // User Profile Management
    Route::put('/user/profile', [UserProfileController::class, 'updateProfile'])->name('api.user.profile.update');
    Route::post('/user/password', [UserProfileController::class, 'changePassword'])->name('api.user.password.change');

    // User Address Management
    Route::prefix('user/addresses')->name('api.user.addresses.')->controller(UserAddressController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/{address}', 'show')->name('show');
        Route::put('/{address}', 'update')->name('update');
        Route::delete('/{address}', 'destroy')->name('destroy');
    });

    // Cart Routes
    Route::prefix('cart')->name('api.cart.')->controller(CartController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/add', 'addItem')->name('add');
        Route::put('/update/{productId}', 'updateItem')->name('update');
        Route::delete('/remove/{productId}', 'removeItem')->name('remove');
        Route::delete('/clear', 'clearCart')->name('clear');
    });

    // Order Routes
    Route::prefix('orders')->name('api.orders.')->controller(OrderController::class)->group(function () {
        Route::post('/place', 'placeOrder')->name('place');
        Route::get('/', 'index')->name('index');
        Route::get('/{order}', 'show')->name('show');
        Route::post('/{order}/cancel', 'cancelOrder')->name('cancel');
    });

    Route::prefix('notifications')->name('api.notifications.')->controller(NotificationController::class)->group(function () {
        Route::get('/', 'index')->name('index'); // GET /api/notifications
        Route::get('/unread-count', 'unreadCount')->name('unreadCount'); // GET /api/notifications/unread-count
        Route::post('/mark-all-read', 'markAllAsRead')->name('markAllAsRead'); // POST /api/notifications/mark-all-read
        Route::patch('/{notification}/read', 'markAsRead')->name('markAsRead'); // PATCH /api/notifications/{notification_id}/read
    });
});


//======================================================================
// ADMIN ROUTES (Cần đăng nhập và có quyền Admin)
//======================================================================
Route::middleware(['auth:sanctum', CheckAdminRole::class])->prefix('admin')->name('api.admin.')->group(function () {

    // Admin - Product Management
    Route::prefix('products')->name('products.')->controller(ProductController::class)->group(function () {
        Route::get('/', 'index')->name('index'); // GET /api/admin/products
        Route::post('/', 'store')->name('store'); // POST /api/admin/products
        Route::get('/{product}', 'show')->name('show'); // GET /api/admin/products/{product} - Sử dụng method 'show' của admin
        Route::post('/{product}', 'update')->name('update.post'); // POST /api/admin/products/{product} (cho form data với _method=PUT)
        Route::put('/{product}', 'update')->name('update'); // PUT /api/admin/products/{product}
        Route::delete('/{product}', 'destroy')->name('destroy'); // DELETE /api/admin/products/{product}
    });

    // Admin - User Management
    Route::prefix('users')->name('users.')->controller(AdminUserController::class)->group(function () {
        Route::get('/', 'index')->name('index'); // GET /api/admin/users
        Route::put('/{user}/status', 'updateUserStatus')->name('updateStatus'); // PUT /api/admin/users/{user}/status
    });

    // Admin - Order Management
    Route::prefix('orders')->name('orders.')->controller(OrderController::class)->group(function () {
        Route::get('/', 'adminIndex')->name('index'); // GET /api/admin/orders
        Route::get('/{order}', 'adminShow')->name('show'); // GET /api/admin/orders/{order}
        Route::put('/{order}/status', 'adminUpdateStatus')->name('updateStatus'); // PUT /api/admin/orders/{order}/status
    });

    Route::prefix('revenue')->name('revenue.')->controller(AdminRevenueController::class)->group(function () {
        Route::get('/summary', 'getRevenueSummary')->name('summary'); // GET /api/admin/revenue/summary
    });
});
