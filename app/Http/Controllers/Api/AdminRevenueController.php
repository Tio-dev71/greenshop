<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminRevenueController extends Controller
{
    public function getRevenueSummary(Request $request)
    {
        $request->validate([
            'from_date' => 'nullable|date_format:Y-m-d',
            'to_date' => 'nullable|date_format:Y-m-d|after_or_equal:from_date',
            'group_by' => 'nullable|string|in:day,month,year',
        ]);

        $fromDate = $request->input('from_date', Carbon::now()->subMonth()->toDateString());
        $toDate = $request->input('to_date', Carbon::now()->toDateString());
        $groupBy = $request->input('group_by', 'day');

        $revenueQuery = Order::where('Status', 'delivered')
            ->whereDate('updated_at', '>=', $fromDate)
            ->whereDate('updated_at', '<=', $toDate);

        if ($groupBy === 'day') {
            $revenueQuery->select(
                DB::raw('DATE(updated_at) as period_identifier'),
                DB::raw('COUNT(OrderID) as total_orders'),
                DB::raw('SUM(TotalAmount) as total_revenue')
            )->groupBy('period_identifier')->orderBy('period_identifier', 'desc');
        } elseif ($groupBy === 'month') {
            $revenueQuery->select(
                DB::raw('YEAR(updated_at) as year'),
                DB::raw('MONTH(updated_at) as month'),
                DB::raw('COUNT(OrderID) as total_orders'),
                DB::raw('SUM(TotalAmount) as total_revenue')
            )->groupBy('year', 'month')->orderBy('year', 'desc')->orderBy('month', 'desc');
        } elseif ($groupBy === 'year') {
            $revenueQuery->select(
                DB::raw('YEAR(updated_at) as year'),
                DB::raw('COUNT(OrderID) as total_orders'),
                DB::raw('SUM(TotalAmount) as total_revenue')
            )->groupBy('year')->orderBy('year', 'desc');
        }

        $paginatedRevenue = $revenueQuery->paginate(15);

        $paginatedRevenue->getCollection()->transform(function ($item) use ($groupBy) {
            $orderIdsQuery = Order::where('Status', 'delivered');

            if ($groupBy === 'day') {
                $orderIdsQuery->whereDate('updated_at', $item->period_identifier);
            } elseif ($groupBy === 'month') {
                $orderIdsQuery->whereYear('updated_at', $item->year)
                    ->whereMonth('updated_at', $item->month);
            } elseif ($groupBy === 'year') {
                $orderIdsQuery->whereYear('updated_at', $item->year);
            }
            $orderIds = $orderIdsQuery->pluck('OrderID');

            $totalProductsSold = DB::table('order_product')
                ->whereIn('OrderID', $orderIds)
                ->sum('Quantity');
            $item->total_products_sold = $totalProductsSold;
            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $paginatedRevenue,
            'message' => 'Revenue summary retrieved successfully.'
        ]);
    }
}
