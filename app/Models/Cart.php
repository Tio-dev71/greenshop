<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class Cart extends Model
{
    use HasFactory;

    protected $primaryKey = 'CartID';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'UserID',
        'TotalAmount',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'UserID', 'id');
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'cart_product', 'CartID', 'ProductID')
            ->withPivot('Quantity');
    }

    public function updateTotalAmount(): bool
    {
        try {
            // Tải lại quan hệ products để đảm bảo dữ liệu mới nhất
            $this->load('products');

            $total = 0;
            foreach ($this->products as $product) {
                $quantityInCart = $product->pivot->Quantity;
                // Sử dụng accessor discounted_price nếu có, nếu không thì dùng giá gốc
                // Giả định Product model có accessor getDiscountedPriceAttribute()
                $priceAfterDiscount = $product->discounted_price ?? $product->Price;
                $subTotal = $priceAfterDiscount * $quantityInCart;
                $total += $subTotal;
            }

            $this->TotalAmount = $total;
            return $this->save(); // Lưu thay đổi vào database

        } catch (\Exception $e) {
            Log::error("Error updating cart total amount for CartID {$this->CartID}: " . $e->getMessage());
            return false; // Trả về false nếu có lỗi
        }
    }
}
