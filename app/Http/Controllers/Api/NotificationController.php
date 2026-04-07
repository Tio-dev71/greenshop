<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Display a listing of the user's notifications.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $notifications = $user->notifications()
            ->orderByDesc('created_at') // Use created_at from timestamps() for ordering
            ->paginate(15); // Or your preferred page size

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'message' => 'Notifications retrieved successfully.'
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, Notification $notification)
    {
        $user = $request->user();
        if ($notification->UserID !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (!$notification->read_at) {
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => $notification->fresh()
        ]);
    }

    /**
     * Mark all unread notifications of the user as read.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        $updatedCount = $user->notifications()->unread()->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => $updatedCount > 0 ? 'All unread notifications marked as read.' : 'No new notifications to mark as read.',
            'updated_count' => $updatedCount
        ]);
    }

    /**
     * Get the count of unread notifications for the user.
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $count = $user->notifications()->unread()->count();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $count
            ],
            'message' => 'Unread notification count retrieved.'
        ]);
    }
}
