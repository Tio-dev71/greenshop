<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';
    protected $primaryKey = 'OrderID';

    protected $fillable = [
        'UserID',
        'AddressID',
        'TotalAmount',
        'Payment', // Phương thức thanh toán (ví dụ: 'COD', 'OnlineBanking')
        'Status',    // Trạng thái đơn hàng (ví dụ: 'pending', 'processing', 'shipped', 'delivered', 'cancelled')
        // Thêm các trường khác nếu cần: notes, shipping_fee,...
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'UserID', 'id');
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(UserAddress::class, 'AddressID', 'AddressID');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'order_product', 'OrderID', 'ProductID')
            ->withPivot('Quantity', 'Price', 'Discount'); // Quan trọng: Lấy thêm các cột từ bảng pivot
    }
}
