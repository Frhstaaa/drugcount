<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\CountingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * Tampilkan halaman login.
     */
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('verification');
        }

        return Inertia::render('Auth/Login');
    }

    /**
     * Proses autentikasi login.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        if (!Auth::attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => 'Email atau kata sandi yang Anda masukkan tidak sesuai.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('verification'));
    }

    /**
     * Tampilkan halaman registrasi petugas baru.
     */
    public function showRegister()
    {
        if (Auth::check()) {
            return redirect()->route('verification');
        }

        return Inertia::render('Auth/Register');
    }

    /**
     * Proses pendaftaran akun petugas farmasi baru.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'name.required' => 'Nama lengkap petugas wajib diisi.',
            'email.required' => 'Alamat email dinas wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar di sistem.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
        ]);

        // Cek apakah ini user pertama yang mendaftar
        $isFirstUser = (User::count() === 0);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Sesuai kesepakatan: kaitkan data riwayat lama ke akun user pertama
        if ($isFirstUser) {
            CountingSession::whereNull('user_id')->update([
                'user_id' => $user->id,
                'pharmacist_name' => $user->name,
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('verification');
    }

    /**
     * Keluar dari sesi aplikasi.
     */
    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
