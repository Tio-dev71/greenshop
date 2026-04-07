<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckAdminRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->Role == 1) {
            return $next($request);
        }

        return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
    }
}
