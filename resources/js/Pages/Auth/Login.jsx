import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Pill, Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col justify-between items-center p-4 sm:p-6 text-on-surface font-body-md relative overflow-hidden">
            <Head title="Masuk Petugas - PillCount AI" />

            {/* Background Ambient Glows */}
            <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

            {/* Header Brand */}
            <div className="w-full max-w-md pt-6 flex flex-col items-center text-center z-10">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5 mb-3 group hover:border-primary/40 transition-all">
                    <Pill className="w-7 h-7 text-primary transition-transform group-hover:scale-110" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-label-code text-primary font-medium tracking-wide uppercase mb-1">
                    <Sparkles className="w-3 h-3" />
                    Multi-User Workstation
                </div>
                <h1 className="font-headline-md text-2xl font-bold tracking-tight text-on-surface">
                    PillCount AI
                </h1>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                    Sistem Otomasi Verifikasi Obat & Audit Riwayat Presisi Berbasis Computer Vision
                </p>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-surface-container/90 backdrop-blur-xl border border-surface-container-highest/80 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-6">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-on-surface font-headline-sm flex items-center gap-2">
                        <LogIn className="w-5 h-5 text-primary" />
                        Masuk Petugas Farmasi
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        Gunakan email dinas dan kata sandi Anda untuk mengakses workstation.
                    </p>
                </div>

                {/* Form Errors Banner */}
                {errors.email && (
                    <div className="mb-5 p-3 rounded-xl bg-error-container/40 border border-error/30 text-error flex items-start gap-2.5 text-xs animate-shake">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errors.email}</span>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    {/* Input Email */}
                    <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1.5 font-label-ui">
                            Email Dinas / Petugas
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
                                placeholder="nama@klinik.id atau apoteker@rs.com"
                                required
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-high/80 border border-outline-variant/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm"
                            />
                        </div>
                    </div>

                    {/* Input Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-medium text-on-surface-variant font-label-ui">
                                Kata Sandi
                            </label>
                        </div>
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
                            <p className="text-[11px] text-error mt-1">{errors.password}</p>
                        )}
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="w-4 h-4 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer"
                            />
                            <span className="text-xs text-on-surface-variant">
                                Ingat saya di perangkat ini
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full mt-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Masuk ke Workstation</span>
                                <LogIn className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-surface-container-highest" />
                    </div>
                    <span className="relative px-3 bg-surface-container text-[11px] text-on-surface-variant uppercase tracking-wider font-label-code">
                        Petugas Baru?
                    </span>
                </div>

                {/* Register Link Button */}
                <Link
                    href="/register"
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high border border-outline-variant/60 hover:border-primary/50 text-on-surface text-xs font-medium flex items-center justify-center gap-2 hover:text-primary active:scale-[0.99] transition-all text-center"
                >
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Daftarkan Akun Petugas Farmasi</span>
                </Link>
            </div>

            {/* Footer */}
            <div className="w-full max-w-md pb-4 text-center z-10">
                <p className="text-[11px] text-on-surface-variant/60 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary/70" />
                    Standar Keselamatan Pasien • Isolasi Riwayat Terproteksi
                </p>
            </div>
        </div>
    );
}
