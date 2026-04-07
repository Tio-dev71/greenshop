<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\UserAddress;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Facades\Log; // Đảm bảo Log được import

class OrderController extends Controller
{
    // Hai dòng code gây lỗi đã được di chuyển vào phương thức adminIndex()

    public function placeOrder(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'address_id' => 'required|integer|exists:user_addresses,AddressID',
            'cart_id' => ['required', 'integer', 'exists:carts,CartID',
                function ($attribute, $value, $fail) use ($user) {
                    $cart = Cart::find($value);
                    if (!$cart || $cart->UserID !== $user->id) {
                        $fail('The selected cart does not belong to the current user.');
                    }
                },
            ],
            'payment_method' => 'required|string|in:COD,OnlineBanking',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $address = UserAddress::where('AddressID', $request->input('address_id'))
            ->where('UserID', $user->id)
            ->first();

        if (!$address) {
            return response()->json(['success' => false, 'message' => 'Invalid shipping address.'], 400);
        }

        $cart = Cart::with('products')->find($request->input('cart_id'));

        if (!$cart) {
            return response()->json(['success' => false, 'message' => 'Cart not found.'], 404);
        }
        if ($cart->products->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Your cart is empty.'], 400);
        }

        $orderTotalAmountFromCart = $cart->TotalAmount;

        if ($orderTotalAmountFromCart <= 0) {
            $cart->updateTotalAmount(); // Cập nhật lại tổng tiền giỏ hàng
            $orderTotalAmountFromCart = $cart->TotalAmount;
            if ($orderTotalAmountFromCart <= 0) {
                return response()->json(['success' => false, 'message' => 'Cart total amount is invalid. Please refresh your cart.'], 400);
            }
        }


        DB::beginTransaction();

        try {
            $orderItemsData = [];

            foreach ($cart->products as $cartProduct) {
                $product = Product::where('ProductID', $cartProduct->ProductID)->lockForUpdate()->first();

                if (!$product) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => "Product '{$cartProduct->ProductName}' not found during order processing."], 404);
                }

                $quantityInCart = $cartProduct->pivot->Quantity;

                if ($product->Quantity < $quantityInCart) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Product '{$product->ProductName}' is out of stock or insufficient quantity.",
                        'product_id' => $product->ProductID,
                        'available_stock' => $product->Quantity,
                        'requested_quantity' => $quantityInCart,
                    ], 400);
                }

                $priceAtOrder = $product->discounted_price ?? $product->Price;
                $discountAtOrder = $product->Discount;

                $orderItemsData[$product->ProductID] = [
                    'Quantity' => $quantityInCart,
                    'Price' => $priceAtOrder,
                    'Discount' => $discountAtOrder,
                ];

                $product->Quantity -= $quantityInCart;
                $product->save();
            }

            $finalOrderTotal = $orderTotalAmountFromCart;

            $order = Order::create([
                'UserID' => $user->id,
                'AddressID' => $address->AddressID,
                'TotalAmount' => $finalOrderTotal,
                'Payment' => $request->input('payment_method'),
                'Status' => 'pending',
            ]);

            $order->products()->attach($orderItemsData);

            $cart->products()->detach();
            $cart->updateTotalAmount();


            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully.',
                'data' => [
                    'order_id' => $order->OrderID,
                    'total_amount' => $order->TotalAmount,
                    'status' => $order->Status,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order placement error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'cart_id' => $cart->CartID ?? null,
                'request' => $request->except('password'),
                'exception' => $e
            ]);
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while placing the order. Please try again later.'
            ], 500);
        }
    }


    public function index(Request $request)
    {
        $user = $request->user();
        $orders = Order::where('UserID', $user->id)
            ->with([
                'products:ProductID,ProductName,Image',
                'address'
            ])
            ->orderByDesc('created_at')
            ->paginate(10); // Ví dụ: 10 đơn hàng mỗi trang cho user thường

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();
        if ($order->UserID !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access to order.'], 403);
        }

        $order->load([
            'products' => function ($query) {
                $query->withPivot('Quantity', 'Price', 'Discount');
            },
            'address',
            'user:id,name,email'
        ]);

        return response()->json(['success' => true, 'data' => $order]);
    }

    public function cancelOrder(Request $request, Order $order)
    {
        $user = $request->user();
        if ($order->UserID !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $cancellableStatuses = ['pending', 'processing'];
        if (!in_array($order->Status, $cancellableStatuses)) {
            return response()->json([
                'success' => false,
                'message' => 'Order cannot be cancelled at its current status (' . $order->Status . ').'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $order->Status = 'cancelled';
            $order->save();

            foreach ($order->products as $orderedProduct) {
                $product = Product::where('ProductID', $orderedProduct->ProductID)->lockForUpdate()->first();
                if ($product) {
                    $product->Quantity += $orderedProduct->pivot->Quantity;
                    $product->save();
                } else {
                    Log::warning("Product not found when restoring stock for cancelled order.", ['product_id' => $orderedProduct->ProductID, 'order_id' => $order->OrderID]);
                }
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully.',
                'data' => $order->fresh()->load('products')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order cancellation error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'order_id' => $order->OrderID,
                'exception' => $e
            ]);
            return response()->json(['success' => false, 'message' => 'Error cancelling order. Please try again.'], 500);
        }
    }


    // ADMIN ROUTES
    public function adminIndex(Request $request)
    {
        $query = Order::with(['user:id,name,email', 'address'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('Status', $request->status);
        }

        if ($request->filled('user_id') && is_numeric($request->user_id)) {
            $query->where('UserID', $request->user_id);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('OrderID', 'like', "%{$searchTerm}%")
                    ->orWhereHas('user', function ($userQuery) use ($searchTerm) {
                        $userQuery->where('name', 'like', "%{$searchTerm}%")
                            ->orWhere('email', 'like', "%{$searchTerm}%");
                    })
                    ->orWhereHas('address', function ($addressQuery) use ($searchTerm) {
                        $addressQuery->where('CustomerName', 'like', "%{$searchTerm}%");
                    });
            });
        }

        // Đã di chuyển vào đây và sửa thành 8
        $perPage = $request->input('per_page', 10);
        $orders = $query->paginate($perPage);

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function adminShow(Order $order)
    {
        $order->load([
            'user:id,name,email,PhoneNumber',
            'address',
            'products' => function ($query) {
                $query->withPivot('Quantity', 'Price', 'Discount');
            }
        ]);

        return response()->json(['success' => true, 'data' => $order]);
    }

    private function translateOrderStatusHelper(string $status): string
    {
        $translations = [
            'pending' => 'Chờ xác nhận',
            'processing' => 'Đang xử lý',
            'shipped' => 'Đang giao hàng',
            'delivered' => 'Đã giao hàng',
            'cancelled' => 'Đã hủy',
            'failed' => 'Thất bại',
        ];
        return $translations[strtolower($status)] ?? ucfirst($status);
    }


    public function adminUpdateStatus(Request $request, Order $order)
    {
        $validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];
        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string', \Illuminate\Validation\Rule::in($validStatuses)],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $newStatus = $request->input('status');
        $oldStatus = $order->Status;

        if ($oldStatus !== 'cancelled' && $newStatus === 'cancelled') {
            DB::beginTransaction();
            try {
                $order->Status = $newStatus;
                $order->save();
                foreach ($order->products as $orderedProduct) {
                    $product = Product::where('ProductID', $orderedProduct->ProductID)->lockForUpdate()->first();
                    if ($product) {
                        $product->Quantity += $orderedProduct->pivot->Quantity;
                        $product->save();
                    } else {
                        Log::warning("Product not found when restoring stock for admin-cancelled order.", ['product_id' => $orderedProduct->ProductID, 'order_id' => $order->OrderID]);
                    }
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Admin Order status update to cancelled error: ' . $e->getMessage(), [
                    'order_id' => $order->OrderID, 'exception' => $e
                ]);
                return response()->json(['success' => false, 'message' => 'Error updating order status to cancelled. ' . $e->getMessage()], 500);
            }
        } elseif ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
            DB::beginTransaction();
            try {
                foreach ($order->products as $orderedProduct) {
                    $product = Product::where('ProductID', $orderedProduct->ProductID)->lockForUpdate()->first();
                    if (!$product || $product->Quantity < $orderedProduct->pivot->Quantity) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => "Cannot change status from cancelled: Insufficient stock for product ID {$orderedProduct->ProductID}.",
                            'product_id' => $orderedProduct->ProductID,
                            'available_stock' => $product->Quantity ?? 0,
                            'required_quantity' => $orderedProduct->pivot->Quantity
                        ], 400);
                    }
                }
                foreach ($order->products as $orderedProduct) {
                    $product = Product::find($orderedProduct->ProductID);
                    if($product){
                        $product->Quantity -= $orderedProduct->pivot->Quantity;
                        $product->save();
                    }
                }

                $order->Status = $newStatus;
                $order->save();
                if ($order->UserID) {
                    $newStatusTranslated = $this->translateOrderStatusHelper($newStatus);
                    Notification::create([
                        'UserID' => $order->UserID,
                        'Title' => "Cập nhật đơn hàng #{$order->OrderID}",
                        'Description' => "Trạng thái đơn hàng #{$order->OrderID} của bạn đã được cập nhật thành: '{$newStatusTranslated}'.",
                        'Date' => now(),
                    ]);
                }
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Admin Order status update from cancelled error: ' . $e->getMessage(), [
                    'order_id' => $order->OrderID, 'exception' => $e
                ]);
                return response()->json(['success' => false, 'message' => 'Error updating order status from cancelled. ' . $e->getMessage()], 500);
            }
        } else {
            if($oldStatus !== $newStatus) {
                $order->Status = $newStatus;
                $order->save();
                if ($order->UserID) {
                    $newStatusTranslated = $this->translateOrderStatusHelper($newStatus);
                    Notification::create([
                        'UserID' => $order->UserID,
                        'Title' => "Cập nhật đơn hàng #{$order->OrderID}",
                        'Description' => "Trạng thái đơn hàng #{$order->OrderID} của bạn đã được cập nhật thành: '{$newStatusTranslated}'.",
                        'Date' => now(),
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully.',
            'data' => $order->fresh()
        ]);
    }
}
