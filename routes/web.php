<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PillDetectorController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web & API Routes - PillCount Multi-User
|--------------------------------------------------------------------------
*/

// Tamu / Guest Routes (Belum Login)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

// Sesi Terautentikasi (Wajib Login)
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // UI Views
    Route::get('/', [PageController::class, 'index'])->name('verification');
    Route::get('/history', [PageController::class, 'history'])->name('history');
    Route::get('/settings', [PageController::class, 'settings'])->name('settings');

    // Pill Detection & Session Management APIs
    Route::prefix('api')->group(function () {
        Route::post('/detect', [PillDetectorController::class, 'detect'])->name('api.detect');
        Route::get('/sessions', [PillDetectorController::class, 'list'])->name('api.sessions.list');
        Route::post('/sessions', [PillDetectorController::class, 'store'])->name('api.sessions.store');
        Route::delete('/sessions/{id}', [PillDetectorController::class, 'destroy'])->name('api.sessions.destroy');
    });
});

// System Health Check (Bisa diakses untuk monitoring server/daemon)
Route::get('/api/health', [PillDetectorController::class, 'health'])->name('api.health');
