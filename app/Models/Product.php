<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'ProductID'; // Khai báo khóa chính

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true; // Khóa chính là tự tăng

    /**
     * The "type" of the auto-incrementing ID.
     *
     * @var string
     */
    protected $keyType = 'int'; // Kiểu dữ liệu của khóa chính

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'ProductName',
        'Description',
        'Price',
        'Quantity',
        'Category',
        'Image',
        'Discount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'Price' => 'decimal:2',
        'Discount' => 'decimal:2', // Giả sử Discount lưu dưới dạng tỉ lệ thập phân (ví dụ: 0.10 cho 10%)
        'Quantity' => 'integer',
    ];

    /**
     * (Tùy chọn) Accessor để lấy giá sau khi đã giảm giá.
     * Tên accessor sẽ là get{TênThuộcTính}Attribute.
     * Ví dụ: $product->discounted_price
     */
    public function getDiscountedPriceAttribute(): float
    {
        // Giả sử Discount lưu dưới dạng tỉ lệ thập phân (ví dụ: 0.10 cho 10%)
        if ($this->Discount > 0 && $this->Discount <= 1) {
            return (float) $this->Price * (1 - $this->Discount);
        }
        // Nếu Discount > 1, có thể nó là số tiền giảm giá cố định, hoặc % dạng số nguyên (ví dụ 10 cho 10%)
        // Bạn cần điều chỉnh logic này cho phù hợp với cách bạn lưu trữ Discount
        // Ví dụ, nếu Discount là % dạng số nguyên (10 cho 10%):
        // if ($this->Discount > 0 && $this->Discount <= 100) {
        //     return (float) $this->Price * (1 - ($this->Discount / 100));
        // }
        return (float) $this->Price;
    }

    /**
     * (Tùy chọn) Accessor để lấy URL đầy đủ của ảnh.
     * Ví dụ: $product->image_url
     * Đảm bảo bạn đã chạy `php artisan storage:link`
     */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->Image) {
            // Nếu Image đã là URL đầy đủ (ví dụ: lưu từ nguồn bên ngoài)
            if (filter_var($this->Image, FILTER_VALIDATE_URL)) {
                return $this->Image;
            }
            // Nếu Image là đường dẫn tương đối trong storage/app/public
            return asset('storage/' . $this->Image);
        }
        // Trả về ảnh placeholder nếu không có ảnh
        // return asset('assets/img/placeholder.png'); // Điều chỉnh đường dẫn nếu cần
        return null;
    }

    /**
     * (Tùy chọn) Thêm accessor vào mảng $appends để nó tự động được thêm vào khi model được serialize (ví dụ, khi trả về JSON).
     *
     * @var array
     */
    // protected $appends = ['discounted_price', 'image_url'];

}
