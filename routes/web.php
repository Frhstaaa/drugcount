<?php

use App\Http\Controllers\PageController;
use App\Http\Controllers\PillDetectorController;
use Illuminate\Support\Facades\Route;

// Inertia UI Views
Route::get('/', [PageController::class, 'index'])->name('verification');
Route::get('/history', [PageController::class, 'history'])->name('history');
Route::get('/settings', [PageController::class, 'settings'])->name('settings');

// Pill Detection and Session Management APIs
Route::prefix('api')->group(function () {
    Route::post('/detect', [PillDetectorController::class, 'detect'])->name('api.detect');
    Route::get('/sessions', [PillDetectorController::class, 'list'])->name('api.sessions.list');
    Route::post('/sessions', [PillDetectorController::class, 'store'])->name('api.sessions.store');
    Route::delete('/sessions/{id}', [PillDetectorController::class, 'destroy'])->name('api.sessions.destroy');
});
