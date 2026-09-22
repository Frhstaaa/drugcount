import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { 
    Pill, 
    ArrowLeft, 
    Zap, 
    ZapOff, 
    RefreshCw, 
    Sliders, 
    Scan, 
    History,
    LogOut,
    User as UserIcon,
    Shield
} from 'lucide-react';

export default function Navbar({ onTorchToggle, torchState, onCameraSwitch, hasTorch = false }) {
    const { url, props } = usePage();
    const user = props?.auth?.user;
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <>
            {/* Fixed Top Header */}
            <header className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-container-highest/60 pt-safe transition-all">
                <div className="max-w-md mx-auto h-14 px-3 flex items-center justify-between">
                    {/* Brand / Back Button */}
                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            aria-label="Beranda"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high/80 text-on-surface hover:text-primary active:scale-95 transition-all shadow-sm"
                        >
                            {url === '/' ? (
                                <Pill className="w-4 h-4 text-primary" />
                            ) : (
                                <ArrowLeft className="w-4 h-4" />
                            )}
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="font-headline-sm text-sm sm:text-base font-bold tracking-tight text-on-surface leading-none">
                                PillCount
                            </h1>
                            {user ? (
                                <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-[120px] sm:max-w-[150px] mt-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block shrink-0" />
                                    {user.name}
                                </span>
                            ) : (
                                <span className="text-[9px] font-label-code text-primary font-semibold tracking-wider uppercase mt-0.5">
                                    AI CV Engine
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1">
                        {onTorchToggle && (
                            <button
                                aria-label="Toggle Flashlight"
                                onClick={onTorchToggle}
                                type="button"
                                className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                                    torchState
                                        ? 'bg-primary-container text-on-primary shadow-[0_0_10px_rgba(107,216,203,0.5)]'
                                        : 'bg-surface-container-high/80 text-on-surface-variant hover:text-primary active:scale-95'
                                }`}
                                title="Senter / Flashlight"
                            >
                                {torchState ? (
                                    <Zap className="w-4 h-4" />
                                ) : (
                                    <ZapOff className="w-4 h-4" />
                                )}
                            </button>
                        )}

                        {onCameraSwitch && (
                            <button
                                aria-label="Switch Camera"
                                onClick={onCameraSwitch}
                                type="button"
                                className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-surface-container-high/80 text-on-surface-variant hover:text-primary active:scale-95 transition-all shadow-sm"
                                title="Ganti Kamera Depan/Belakang"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}

                        <Link
                            href="/settings"
                            className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                                url === '/settings'
                                    ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(107,216,203,0.4)]'
                                    : 'bg-surface-container-high/80 text-on-surface-variant hover:text-primary active:scale-95'
                            }`}
                            title="Pengaturan & Kalibrasi"
                        >
                            <Sliders className="w-4 h-4" />
                        </Link>

                        {/* User Profile & Logout Button */}
                        {user && (
                            <div className="relative ml-0.5">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    type="button"
                                    className="h-8.5 px-2 rounded-xl bg-surface-container-high/90 hover:bg-surface-container-highest border border-outline-variant/50 text-on-surface flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                                    title={`Akun: ${user.name} (${user.email})`}
                                >
                                    <div className="w-5 h-5 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <LogOut className="w-3.5 h-3.5 text-on-surface-variant hover:text-error transition-colors" />
                                </button>

                                {/* Dropdown Menu */}
                                {showUserMenu && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setShowUserMenu(false)} 
                                        />
                                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-container-high border border-surface-container-highest/90 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="pb-2.5 mb-2 border-b border-surface-container-highest">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-semibold text-on-surface truncate">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-[10px] text-on-surface-variant truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-medium">
                                                    <Shield className="w-3 h-3" />
                                                    Riwayat Terisolasi Aktif
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                    setShowLogoutConfirm(true);
                                                }}
                                                className="w-full py-2 px-3 rounded-xl bg-error-container/30 hover:bg-error-container/60 text-error text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer text-left"
                                            >
                                                <LogOut className="w-3.5 h-3.5 shrink-0" />
                                                <span>Keluar dari Aplikasi</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal Konfirmasi Logout */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-xs bg-surface-container-high border border-surface-container-highest rounded-3xl p-5 shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-2xl bg-error-container/30 text-error mx-auto flex items-center justify-center mb-3">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <h3 className="font-headline-sm text-base font-bold text-on-surface">
                            Keluar dari Aplikasi?
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1.5 mb-5 leading-relaxed">
                            Anda akan keluar dari sesi akun <strong>{user?.name}</strong>. Semua sesi verifikasi yang telah disimpan tetap aman di server.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setShowLogoutConfirm(false)}
                                className="py-2.5 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="py-2.5 px-3 rounded-xl bg-error text-on-error text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                            >
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar for Mobile */}
            <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-highest/60 pb-safe">
                <div className="max-w-md mx-auto grid grid-cols-3 h-13">
                    <Link
                        href="/"
                        className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors py-1.5 ${
                            url === '/'
                                ? 'text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Scan className="w-5 h-5" />
                        <span>Verifikasi</span>
                    </Link>

                    <Link
                        href="/history"
                        className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors py-1.5 ${
                            url.startsWith('/history')
                                ? 'text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <History className="w-5 h-5" />
                        <span>Riwayat</span>
                    </Link>

                    <Link
                        href="/settings"
                        className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors py-1.5 ${
                            url.startsWith('/settings')
                                ? 'text-primary font-semibold'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Sliders className="w-5 h-5" />
                        <span>Kalibrasi</span>
                    </Link>
                </div>
            </nav>
        </>
    );
}
