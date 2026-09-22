<?php

namespace App\Http\Controllers;

use App\Models\CountingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class PageController extends Controller
{
    /**
     * Pastikan schema tabel mutakhir.
     */
    protected function ensureMigration(): void
    {
        if (!Schema::hasColumn('counting_sessions', 'user_id')) {
            try {
                Artisan::call('migrate', ['--force' => true]);
            } catch (\Throwable $e) {
                // Abaikan jika database terkunci
            }
        }
    }

    /**
     * Camera verification session screen (Main Viewfinder).
     */
    public function index()
    {
        $this->ensureMigration();

        $userId = auth()->id();
        $hasUserCol = Schema::hasColumn('counting_sessions', 'user_id');

        $queryToday = CountingSession::whereDate('created_at', today());
        if ($hasUserCol && $userId) {
            $queryToday->where('user_id', $userId);
        }

        $todayCount = (clone $queryToday)->count();
        $totalPillsToday = (clone $queryToday)->sum('manual_count');

        $recentQuery = CountingSession::latest()->take(5);
        if ($hasUserCol && $userId) {
            $recentQuery->where('user_id', $userId);
        }
        $recentSessions = $recentQuery->get();

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
        $this->ensureMigration();

        $userId = auth()->id();
        $hasUserCol = Schema::hasColumn('counting_sessions', 'user_id');

        $query = CountingSession::latest();
        if ($hasUserCol && $userId) {
            $query->where('user_id', $userId);
        }

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
