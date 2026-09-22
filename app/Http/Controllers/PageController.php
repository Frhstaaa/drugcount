<?php

namespace App\Http\Controllers;

use App\Models\CountingSession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PageController extends Controller
{
    /**
     * Camera verification session screen (Main Viewfinder).
     */
    public function index()
    {
        $userId = auth()->id();

        $todayCount = CountingSession::where('user_id', $userId)
            ->whereDate('created_at', today())
            ->count();

        $totalPillsToday = CountingSession::where('user_id', $userId)
            ->whereDate('created_at', today())
            ->sum('manual_count');

        $recentSessions = CountingSession::where('user_id', $userId)
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('VerificationSession', [
            'stats' => [
                'today_sessions' => $todayCount,
                'today_pills' => $totalPillsToday,
            ],
            'recentSessions' => $recentSessions,
        ]);
    }

    /**
     * History list and verification archives (Scoped to current authenticated user).
     */
    public function history(Request $request)
    {
        $userId = auth()->id();

        $query = CountingSession::where('user_id', $userId)->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('medicine_name', 'like', "%{$search}%")
                  ->orWhere('prescription_no', 'like', "%{$search}%")
                  ->orWhere('pharmacist_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('shape') && $request->input('shape') !== 'all') {
            $query->where('shape_filter', $request->input('shape'));
        }

        $sessions = $query->paginate(12)->withQueryString();

        return Inertia::render('History', [
            'sessions' => $sessions,
            'filters' => [
                'search' => $request->input('search', ''),
                'shape' => $request->input('shape', 'all'),
            ],
        ]);
    }

    /**
     * Detection calibration & configuration settings.
     */
    public function settings()
    {
        return Inertia::render('Settings');
    }
}
