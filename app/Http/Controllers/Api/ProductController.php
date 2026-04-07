<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth; // << THÊM DÒNG NÀY

class ProductController extends Controller
{
    // Helper function để kiểm tra admin (hoặc bạn có thể tạo middleware riêng)
    private function isAdmin(Request $request)
    {
        // Lấy user đang đăng nhập
        $user = $request->user(); // Hoặc Auth::user();
        if ($user && $user->Role == 1) { // Giả sử Role = 1 là admin
            return true;
        }
        return false;
    }

    /**
     * ADMIN: Display a listing of the resource.
     */
    public function index(Request $request) // Thường là GET /api/admin/products
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }
        // ... (code còn lại của bạn cho index) ...
        $query = Product::query();

        if ($request->has('keyword') && $request->keyword != '') {
            $keyword = $request->keyword;
            $query->where(function ($q) use ($keyword) {
                $q->where('ProductName', 'like', "%{$keyword}%")
                    ->orWhere('Description', 'like', "%{$keyword}%")
                    ->orWhere('Category', 'like', "%{$keyword}%")
                    ->when(is_numeric($keyword), function ($subQuery) use ($keyword) {
                        return $subQuery->orWhere('ProductID', $keyword);
                    });
            });
        }

        if ($request->has('category') && $request->category != '') {
            $query->where('Category', $request->category);
        }

        $sortBy = $request->input('sort_by', 'ProductID');
        $sortDirection = $request->input('sort_direction', 'desc');
        $validSortColumns = ['ProductID', 'ProductName', 'Price', 'Quantity', 'Category', 'Discount', 'created_at', 'updated_at'];
        if (in_array($sortBy, $validSortColumns)) {
            $query->orderBy($sortBy, strtolower($sortDirection) === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('ProductID', 'desc');
        }

        $perPage = $request->input('per_page', 7);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
            'message' => 'Admin: Products retrieved successfully.'
        ]);
    }

    /**
     * ADMIN: Store a newly created resource in storage.
     * Đây là hàm THÊM SẢN PHẨM
     */
    public function store(Request $request) // Thường là POST /api/admin/products
    {
        // Kiểm tra quyền admin
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ProductName' => 'required|string|max:255|unique:products,ProductName',
            'Description' => 'nullable|string',
            'Price' => 'required|numeric|min:0',
            'Quantity' => 'required|integer|min:0',
            'Category' => 'nullable|string|max:255',
            'ImageFile' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048', // Sửa thành ImageFile để khớp với Product-Manage.js
            'Discount' => 'nullable|numeric|min:0|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $productData = $validator->validated();

        if ($request->hasFile('ImageFile')) {
            $path = $request->file('ImageFile')->store('products', 'public');
            $productData['Image'] = $path; // Lưu đường dẫn vào cột Image
        }
        // Xóa ImageFile khỏi productData nếu có, vì nó không phải là cột trong DB
        if (isset($productData['ImageFile'])) {
            unset($productData['ImageFile']);
        }

        $product = Product::create($productData);

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Product created successfully.'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Product $product) // Thường là GET /api/admin/products/{product}
    {
        // Nếu muốn cả admin và public đều xem được chi tiết sản phẩm qua route này
        // thì không cần check admin ở đây, nhưng route public nên gọi showPublicProductDetails
        // Nếu route này chỉ dành cho admin xem chi tiết (ví dụ để sửa) thì nên check:
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required for this view.'], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $product,
            'message' => 'Product retrieved successfully.'
        ]);
    }

    /**
     * ADMIN: Update the specified resource in storage.
     * POST /api/admin/products/{product} (do HTML form không hỗ trợ PUT trực tiếp cho file)
     */
    public function update(Request $request, Product $product)
    {
        // Kiểm tra quyền admin
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ProductName' => 'required|string|max:255|unique:products,ProductName,' . $product->ProductID . ',ProductID',
            'Description' => 'nullable|string',
            'Price' => 'required|numeric|min:0',
            'Quantity' => 'required|integer|min:0',
            'Category' => 'nullable|string|max:255',
            'ImageFile' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'Discount' => 'nullable|numeric|min:0|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $productData = $validator->validated();

        if ($request->hasFile('ImageFile')) {
            // Xóa ảnh cũ nếu có và nếu có ảnh mới được tải lên
            if ($product->Image && Storage::disk('public')->exists($product->Image)) {
                Storage::disk('public')->delete($product->Image);
            }
            $path = $request->file('ImageFile')->store('products', 'public');
            $productData['Image'] = $path;
        }
        if (isset($productData['ImageFile'])) {
            unset($productData['ImageFile']);
        }

        $product->update($productData);

        return response()->json([
            'success' => true,
            'data' => $product,
            'message' => 'Product updated successfully.'
        ]);
    }

    /**
     * ADMIN: Remove the specified resource from storage.
     */
    public function destroy(Request $request, Product $product) // Thường là DELETE /api/admin/products/{product}
    {
        // Kiểm tra quyền admin
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        // Xóa file ảnh liên quan nếu có
        if ($product->Image && Storage::disk('public')->exists($product->Image)) {
            Storage::disk('public')->delete($product->Image);
        }
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.'
        ]);
    }

    /**
     * PUBLIC: Display a listing of the products for public users.
     */
    public function listPublicProducts(Request $request) // GET /api/products
    {
        $query = Product::query();

        if ($request->has('keyword') && $request->keyword != '') {
            $keyword = $request->keyword;
            $query->where(function ($q) use ($keyword) {
                $q->where('ProductName', 'like', "%{$keyword}%")
                    ->orWhere('Description', 'like', "%{$keyword}%");
            });
        }

        if ($request->has('category') && $request->category != '') {
            $query->where('Category', $request->category);
        }

        $sortBy = $request->input('sort_by', 'ProductID');
        $sortDirection = $request->input('sort_direction', 'desc');
        $validSortColumnsPublic = ['ProductID', 'ProductName', 'Price', 'created_at'];
        if (in_array($sortBy, $validSortColumnsPublic)) {
            $query->orderBy($sortBy, strtolower($sortDirection) === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('ProductID', 'desc');
        }

        $perPage = $request->input('per_page', 12);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $products,
            'message' => 'Public products retrieved successfully.'
        ]);
    }

    /**
     * PUBLIC: Display product details.
     */
    public function showPublicProductDetails(Product $product) // GET /api/products/{product}
    {
        return response()->json([
            'success' => true,
            'data'    => $product,
            'message' => 'Public: Product details retrieved successfully.'
        ]);
    }
}
