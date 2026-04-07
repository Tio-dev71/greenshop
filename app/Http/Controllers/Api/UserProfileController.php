<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\User;

class UserProfileController extends Controller
{
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'DateOfBirth' => 'sometimes|nullable|date_format:Y-m-d',
            'PhoneNumber' => [
                'sometimes',
                'nullable',
                'string',
                'max:15',
            ],
            'FullName' => 'sometimes|nullable|string|max:255',
        ]);

        $updateData = [];
        if (isset($validatedData['name'])) {
            $updateData['name'] = $validatedData['name'];
        }
        if (array_key_exists('DateOfBirth', $validatedData)) {
            $updateData['DateOfBirth'] = $validatedData['DateOfBirth'];
        }
        if (array_key_exists('PhoneNumber', $validatedData)) {
            $updateData['PhoneNumber'] = $validatedData['PhoneNumber'];
        }
        if (array_key_exists('FullName', $validatedData)) {
            $updateData['FullName'] = $validatedData['FullName'];
        }


        if (!empty($updateData)) {
            $user->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $user->fresh()
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validatedData = $request->validate([
            'current_password' => ['required', 'string', function ($attribute, $value, $fail) use ($user) {
                if (!Hash::check($value, $user->password)) {
                    $fail('Mật khẩu hiện tại không đúng.');
                }
            }],
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user->password = Hash::make($validatedData['new_password']);
        $user->save();

        Notification::create([
            'UserID' => $user->id,
            'Title' => 'Tài khoản được cập nhật',
            'Description' => 'Mật khẩu của bạn đã được thay đổi thành công.',
            'Date' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.'
        ]);
    }
}
