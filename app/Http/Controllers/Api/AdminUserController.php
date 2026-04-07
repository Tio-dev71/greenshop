<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()
            ->where('Role', 0) // Chỉ lấy user thường
            ->withCount(['orders', 'orders as delivered_orders_count' => function ($query) {
                $query->where('Status', 'delivered');
            }])
            ->withSum(['orders as total_spending' => function ($query) {
                $query->where('Status', 'delivered');
            }], 'TotalAmount');

        // Tìm kiếm
        if ($request->has('search') && $request->search != '') {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                    ->orWhere('FullName', 'like', "%{$searchTerm}%")
                    ->orWhere('UserName', 'like', "%{$searchTerm}%")
                    ->orWhere('email', 'like', "%{$searchTerm}%")
                    ->orWhere('PhoneNumber', 'like', "%{$searchTerm}%")
                    ->orWhere('id', $searchTerm); // Cho phép tìm theo ID chính xác
            });
        }

        // Lọc theo trạng thái (MỚI)
        if ($request->has('status') && $request->status !== '') {
            $query->where('Status', $request->status);
        }

        // Sắp xếp
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');
        // Cập nhật danh sách cột sắp xếp hợp lệ nếu cần
        $validSortColumns = ['id', 'name', 'email', 'created_at', 'Status', 'total_spending', 'orders_count'];

        if (in_array($sortBy, $validSortColumns)) {
            if ($sortBy === 'total_spending') {
                // Sắp xếp theo total_spending (đã có sẵn từ withSum)
                $query->orderBy('total_spending', $sortDirection);
            } elseif ($sortBy === 'orders_count') {
                // Sắp xếp theo orders_count (đã có sẵn từ withCount)
                $query->orderBy('orders_count', $sortDirection);
            } else {
                $query->orderBy($sortBy, $sortDirection);
            }
        } else {
            $query->orderBy('created_at', 'desc'); // Mặc định nếu cột không hợp lệ
        }


        $users = $query->paginate($request->input('per_page', 10));

        // Giữ nguyên phần transform dữ liệu trả về
        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'ho_ten' => $user->name, // Giữ 'name' vì JS đang dùng 'name'
                'email' => $user->email,
                'so_dien_thoai' => $user->PhoneNumber,
                'so_don_da_mua' => $user->orders_count, // Đã có orders_count
                'tong_chi_tieu' => (float) ($user->total_spending ?? 0), // Đã có total_spending
                'status' => $user->Status, // Status dạng số (0 hoặc 1)
                'ngay_tao' => $user->created_at->format('d/m/Y H:i'),
            ];
        });

        return response()->json(['success' => true, 'data' => $users]);
    }

    public function updateUserStatus(Request $request, User $user)
    {
        if ($user->Role == 1) {
            return response()->json(['success' => false, 'message' => 'Cannot change status of an admin account via this API.'], 403);
        }

        $request->validate([
            'status' => 'required|integer|in:0,1',
        ]);

        $user->Status = $request->status;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully.',
            'data' => [
                'id' => $user->id,
                'status' => $user->Status,
            ]
        ]);
    }
}
