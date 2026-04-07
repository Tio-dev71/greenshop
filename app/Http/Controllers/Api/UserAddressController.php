<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class UserAddressController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $addresses = $user->addresses()->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
            'message' => 'User addresses retrieved successfully.'
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validator = Validator::make($request->all(), [
            'CustomerName' => 'required|string|max:255',
            'PhoneNumber' => 'required|string|max:20',
            'Street' => 'required|string|max:255',
            'Ward' => 'required|string|max:255',
            'District' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $validatedData = $validator->validated();
        $validatedData['UserID'] = $user->id;

        $address = UserAddress::create($validatedData);

        return response()->json([
            'success' => true,
            'data' => $address,
            'message' => 'Address created successfully.'
        ], 201);
    }

    public function show(Request $request, UserAddress $address)
    {
        if ($request->user()->id !== $address->UserID) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to view this address.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $address,
            'message' => 'Address retrieved successfully.'
        ]);
    }

    public function update(Request $request, UserAddress $address)
    {
        $user = $request->user();
        if ($user->id !== $address->UserID) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to update this address.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'CustomerName' => 'required|string|max:255',
            'PhoneNumber' => 'required|string|max:20',
            'Street' => 'required|string|max:255',
            'Ward' => 'required|string|max:255',
            'District' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $validatedData = $validator->validated();


        $address->update($validatedData);

        return response()->json([
            'success' => true,
            'data' => $address,
            'message' => 'Address updated successfully.'
        ]);
    }

    public function destroy(Request $request, UserAddress $address)
    {
        if ($request->user()->id !== $address->UserID) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to delete this address.'], 403);
        }

        $address->delete(); // Xóa trực tiếp

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully.'
        ]);
    }
}
