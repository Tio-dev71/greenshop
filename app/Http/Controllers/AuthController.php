<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function signup(Request $request) {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'DateOfBirth' => 'nullable|date',
            'PhoneNumber' => 'nullable|string|max:20',
        ]);

        $userData = [
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'Role'     => 0, // Mặc định là user thường
            'Status'   => 1, // THÊM: Mặc định là active (1) khi đăng ký
        ];

        if ($request->filled('DateOfBirth')) {
            $userData['DateOfBirth'] = $request->DateOfBirth;
        }
        if ($request->filled('PhoneNumber')) {
            $userData['PhoneNumber'] = $request->PhoneNumber;
        }

        // Logic tạo tài khoản admin đặc biệt
        if (strtolower($request->email) === 'admin@greenfood.vn') {
            $userData['Role'] = 1;
            $userData['Status'] = 1; // Đảm bảo admin cũng active
        }

        $user = User::create($userData);

        return response()->json(['message' => 'User registered successfully!', 'user' => $user], 201);
    }

    public function login(Request $request) {
        $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['Thông tin đăng nhập không chính xác.'],
            ]);
        }

        $user = Auth::user(); // Lấy thông tin người dùng đã xác thực

        // ---- KIỂM TRA TRẠNG THÁI (STATUS) ----
        if ($user->Status == 0) { // Giả sử 0 là bị khóa, 1 là hoạt động
            // Đăng xuất người dùng ngay lập tức vì tài khoản bị khóa
            // $request->user()->currentAccessToken()->delete(); // Xóa token API đang dùng
            // Hoặc xóa tất cả token của user này:
            $user->tokens()->delete();
            // Và hủy session nếu có (Auth::logout() sẽ làm điều này cho session)
            Auth::logout();


            throw ValidationException::withMessages([
                'email' => ['Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'],
            ]);
        }
        // ---- KẾT THÚC KIỂM TRA TRẠNG THÁI ----

        // Nếu Status hợp lệ, tiếp tục tạo token và trả về response
        $token = $user->createToken('auth_token')->plainTextToken;

        $responseData = [
            'message' => 'Login successful',
            'user' => $user, // Trả về cả thông tin user (bao gồm Status và Role)
            'access_token' => $token,
            'token_type' => 'Bearer',
        ];

        // Phần điều hướng dựa trên Role
        if (isset($user->Role) && $user->Role == 1) {
            $responseData['redirect_to'] = 'Product-Manage.html';
        } else {
            $responseData['redirect_to'] = 'Homepage.html';
        }

        return response()->json($responseData);
    }

    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
            return response()->json(['message' => 'Logged out successfully']);
        }

        return response()->json(['message' => 'No authenticated user to logout or token invalid.'], 401);
    }
}
