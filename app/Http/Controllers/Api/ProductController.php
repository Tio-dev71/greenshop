<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;

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
    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ProductName' => 'required|string|max:255|unique:products,ProductName',
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

        try {
            if ($request->hasFile('ImageFile')) {
                $path = $request->file('ImageFile')->store('greenfood/products', 'cloudinary');

                if (!$path) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Upload ảnh thất bại: không nhận được đường dẫn từ Cloudinary.'
                    ], 500);
                }

                $productData['Image'] = Storage::disk('cloudinary')->url($path);
                $productData['ImagePublicId'] =
                    pathinfo($path, PATHINFO_DIRNAME) . '/' . pathinfo($path, PATHINFO_FILENAME);
            }

            unset($productData['ImageFile']);

            $product = Product::create($productData);

            return response()->json([
                'success' => true,
                'data' => $product,
                'message' => 'Product created successfully.'
            ], 201);

        } catch (\Throwable $e) {
            \Log::error('Cloudinary upload failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload ảnh thất bại: ' . $e->getMessage(),
            ], 500);
        }
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
        if ($request->hasFile('ImageFile')) {
            try {
                $path = $request->file('ImageFile')->store('greenfood/products', 'cloudinary');

                if (!$path) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Upload ảnh thất bại: không nhận được đường dẫn từ Cloudinary.'
                    ], 500);
                }

                $productData['Image'] = Storage::disk('cloudinary')->url($path);
                $productData['ImagePublicId'] =
                    pathinfo($path, PATHINFO_DIRNAME) . '/' . pathinfo($path, PATHINFO_FILENAME);
            } catch (\Throwable $e) {
                \Log::error('Cloudinary upload failed', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Upload ảnh thất bại: ' . $e->getMessage(),
                ], 500);
            }
        }

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
            if (!empty($product->ImagePublicId)) {
                try {
                    cloudinary()->uploadApi()->destroy($product->ImagePublicId, [
                        'resource_type' => 'image',
                    ]);
                } catch (\Throwable $e) {

                }
            }

            $path = $request->file('ImageFile')->store('greenfood/products', 'cloudinary');

            $productData['Image'] = Storage::disk('cloudinary')->url($path);
            $productData['ImagePublicId'] =
                pathinfo($path, PATHINFO_DIRNAME) . '/' . pathinfo($path, PATHINFO_FILENAME);
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
    public function destroy(Request $request, Product $product)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        if (!empty($product->ImagePublicId)) {
            try {
                cloudinary()->uploadApi()->destroy($product->ImagePublicId, [
                    'resource_type' => 'image',
                ]);
            } catch (\Throwable $e) {
                \Log::warning('Cloudinary destroy failed', [
                    'message' => $e->getMessage(),
                    'public_id' => $product->ImagePublicId,
                ]);
            }
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
