import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { 
    Pill, 
    User, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    UserPlus, 
    ShieldCheck, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle,
    ArrowLeft
} from 'lucide-react';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col justify-between items-center p-4 sm:p-6 text-on-surface font-body-md relative overflow-hidden">
            <Head title="Registrasi Petugas - PillCount AI" />

            {/* Background Ambient Glows */}
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

            {/* Header Brand */}
            <div className="w-full max-w-md pt-4 flex flex-col items-center text-center z-10">
                <div className="w-13 h-13 rounded-2xl bg-surface-container-high border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5 mb-2.5 group hover:border-primary/40 transition-all">
                    <Pill className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-label-code text-primary font-medium tracking-wide uppercase mb-1">
                    <Sparkles className="w-3 h-3" />
                    Registrasi Petugas Farmasi
                </div>
                <h1 className="font-headline-md text-2xl font-bold tracking-tight text-on-surface">
                    PillCount AI
                </h1>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                    Daftarkan akun untuk mengisolasi riwayat verifikasi resep dan akuntabilitas penghitungan obat Anda.
                </p>
            </div>

            {/* Register Card */}
            <div className="w-full max-w-md bg-surface-container/90 backdrop-blur-xl border border-surface-container-highest/80 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-4">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-on-surface font-headline-sm flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Buat Akun Baru
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            Lengkapi data di bawah ini untuk memulai.
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Masuk
                    </Link>
                </div>

                {/* Information Tip */}
                <div className="mb-5 p-3 rounded-xl bg-surface-container-high/80 border border-primary/20 text-on-surface-variant flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold text-primary block">Akuntabilitas Mandiri</span>
                        Nama lengkap yang didaftarkan akan otomatis terhubung ke setiap riwayat resep yang Anda hitung.
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-3.5">
                    {/* Input Nama Lengkap */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1 font-label-ui">
                            Nama Lengkap Petugas Farmasi
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="apt. Siti Rahma, S.Farm atau Budi Santoso"
                                required
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm"
                            />
                        </div>
                        {errors.name && (
                            <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Input Email */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1 font-label-ui">
                            Alamat Email Dinas / Kerja
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="siti@farmasi.rs.id"
                                required
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm"
                            />
                        </div>
                        {errors.email && (
                            <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Input Password */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1 font-label-ui">
                            Kata Sandi (Min. 6 Karakter)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                                tabIndex="-1"
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Input Konfirmasi Password */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1 font-label-ui">
                            Ulangi Kata Sandi
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full mt-4 py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Daftarkan Akun & Mulai</span>
                                <UserPlus className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Back to Login Footer */}
                <div className="mt-5 text-center">
                    <p className="text-xs text-on-surface-variant">
                        Sudah memiliki akun terdaftar?{' '}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Masuk ke Aplikasi
                        </Link>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full max-w-md pb-3 text-center z-10">
                <p className="text-[11px] text-on-surface-variant/60 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary/70" />
                    Data riwayat terisolasi penuh per akun petugas farmasi
                </p>
            </div>
        </div>
    );
}
