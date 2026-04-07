<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Product;
use App\Models\Cart;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{

    public function index(Request $request)
    {
        $user = $request->user();
        $cart = Cart::where('UserID', $user->id)->first();

        if (!$cart) {
            $cart = Cart::create(['UserID' => $user->id, 'TotalAmount' => 0]);
        } else {
            if ($cart->TotalAmount === null) {
                // Tính toán lại và lưu nếu là null
                $cart->updateTotalAmount();
            }
        }

        $cartItems = $cart->products()->get();

        $formattedCartItems = $cartItems->map(function ($product) {
            $quantityInCart = $product->pivot->Quantity;
            // Giả định Product model có accessor getDiscountedPriceAttribute()
            $priceAfterDiscount = $product->discounted_price ?? $product->Price;
            $subTotal = $priceAfterDiscount * $quantityInCart;

            return [
                'product_id' => $product->ProductID,
                'product_name' => $product->ProductName,
                'original_price' => (float) $product->Price,
                'discount_percentage' => (float) ($product->Discount * 100),
                'price_after_discount' => (float) $priceAfterDiscount,
                'image_url' => $product->Image ? asset('storage/' . $product->Image) : asset('assets/img/placeholder.png'),
                'quantity_in_cart' => $quantityInCart,
                'sub_total' => (float) $subTotal,
                'category' => $product->Category,
                'available_stock' => $product->Quantity,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'cart_id' => $cart->CartID,
                'user_id' => $cart->UserID,
                'items' => $formattedCartItems,
                'total_unique_items' => $formattedCartItems->count(),
                'total_quantity_items' => $formattedCartItems->sum('quantity_in_cart'),
                'total_amount' => (float) $cart->TotalAmount,
            ],
            'message' => 'Cart retrieved successfully.'
        ]);
    }

    public function addItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer|exists:products,ProductID',
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        $productId = $request->input('product_id');
        $quantityToAdd = $request->input('quantity');

        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $cart = Cart::firstOrCreate(['UserID' => $user->id]);
        $existingProductInCart = $cart->products()->where('products.ProductID', $productId)->first();

        $currentQuantityInCart = $existingProductInCart ? $existingProductInCart->pivot->Quantity : 0;
        $requestedTotalQuantity = $existingProductInCart ? $currentQuantityInCart + $quantityToAdd : $quantityToAdd;

        if ($product->Quantity < $requestedTotalQuantity) {
            return response()->json([
                'success' => false,
                'message' => 'Requested quantity exceeds available stock.',
                'available_stock' => $product->Quantity,
                'current_in_cart' => $currentQuantityInCart
            ], 400); // Bad Request
        }

        if ($existingProductInCart) {
            $cart->products()->updateExistingPivot($productId, ['Quantity' => $requestedTotalQuantity]);
        } else {
            $cart->products()->attach($productId, ['Quantity' => $quantityToAdd]);
        }

        $cart->updateTotalAmount();

        return $this->index($request);
    }

    public function updateItem(Request $request, $productId)
    {
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        $newQuantity = $request->input('quantity');

        $cart = Cart::where('UserID', $user->id)->first();
        if (!$cart) {
            return response()->json(['success' => false, 'message' => 'Cart not found.'], 404);
        }

        $productInCart = $cart->products()->where('products.ProductID', $productId)->first();

        if ($newQuantity > 0) {
            if (!$productInCart) {
                return response()->json(['success' => false, 'message' => 'Product not found in cart to update.'], 404);
            }
            $product = Product::find($productId);
            if ($product && $product->Quantity < $newQuantity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Requested quantity exceeds available stock.',
                    'available_stock' => $product->Quantity
                ], 400);
            }
            $cart->products()->updateExistingPivot($productId, ['Quantity' => $newQuantity]);
        } else { // Nếu số lượng mới là 0
            if ($productInCart) {
                $cart->products()->detach($productId);
            }
        }

        $cart = Cart::find($cart->CartID);
        if($cart) {
            $cart->updateTotalAmount();
        }

        return $this->index($request);
    }

    public function removeItem(Request $request, $productId)
    {
        $user = $request->user();
        $cart = Cart::where('UserID', $user->id)->first();

        if (!$cart) {
            return response()->json(['success' => false, 'message' => 'Cart not found.'], 404);
        }

        $detached = $cart->products()->detach($productId);

        if ($detached) {
            $cart = Cart::find($cart->CartID);
            if($cart) {
                $cart->updateTotalAmount();
            }
            return $this->index($request);
        }

        return response()->json(['success' => false, 'message' => 'Product not found in cart.'], 404);
    }

    public function clearCart(Request $request)
    {
        $user = $request->user();
        $cart = Cart::where('UserID', $user->id)->first();

        if ($cart) {
            $cart->products()->detach();

            $cart->TotalAmount = 0;
            $cart->save();

            return $this->index($request);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'cart_id' => null,
                'user_id' => $user->id,
                'items' => [],
                'total_unique_items' => 0,
                'total_quantity_items' => 0,
                'total_amount' => 0.00,
            ],
            'message' => 'Cart cleared successfully or was already empty.'
        ], 200);
    }
}
