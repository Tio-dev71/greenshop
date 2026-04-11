<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

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

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Trả về thành công giả để tránh leak email người dùng
            return response()->json(['message' => 'Nếu email tồn tại trong hệ thống, bạn sẽ sớm nhận được liên kết đặt lại mật khẩu.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'email' => $request->email,
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]
        );

        // Giả sử frontend url là origin của request
        $frontendUrl = $request->headers->get('referer') ? parse_url($request->headers->get('referer'), PHP_URL_SCHEME) . '://' . parse_url($request->headers->get('referer'), PHP_URL_HOST) : url('/');
        // Link dự kiến: public/Reset-Password.html?token=...&email=...
        $resetLink = $frontendUrl . "/Reset-Password.html?token=" . $token . "&email=" . urlencode($request->email);

        Mail::raw("Chào bạn,\n\nBạn nhận được email này vì chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nLiên kết đặt lại mật khẩu: " . $resetLink . "\n\nLiên kết này sẽ hết hạn sau 60 phút.\n\nNếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.", function ($message) use ($request) {
            $message->to($request->email)->subject('Thông báo đặt lại mật khẩu - GreenFood');
        });

        return response()->json(['message' => 'Liên kết đặt lại mật khẩu đã được gửi vào email của bạn.']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        $reset = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$reset || !Hash::check($request->token, $reset->token)) {
            return response()->json(['message' => 'Token không hợp lệ hoặc đã hết hạn.'], 400);
        }

        // Hết hạn sau 60 phút
        if (Carbon::parse($reset->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Token đã hết hạn.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'Người dùng không tồn tại.'], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Mật khẩu của bạn đã được cập nhật thành công!']);
    }
}
