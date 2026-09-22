import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    Pill, 
    ArrowLeft, 
    Zap, 
    ZapOff, 
    RefreshCw, 
    Sliders, 
    Scan, 
    History 
} from 'lucide-react';

export default function Navbar({ onTorchToggle, torchState, onCameraSwitch, hasTorch = false }) {
    const { url } = usePage();

    return (
        <>
            {/* Fixed Top Header */}
            <header className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl border-b border-surface-container-highest/60 pt-safe transition-all">
                <div className="max-w-md mx-auto h-14 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
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
                            <h1 className="font-headline-sm text-base font-bold tracking-tight text-on-surface leading-none">
                                PillCount
                            </h1>
                            <span className="text-[9px] font-label-code text-primary font-semibold tracking-wider uppercase mt-0.5">
                                AI CV Engine
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {onTorchToggle && (
                            <button
                                aria-label="Toggle Flashlight"
                                onClick={onTorchToggle}
                                type="button"
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${
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
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high/80 text-on-surface-variant hover:text-primary active:scale-95 transition-all shadow-sm"
                                title="Ganti Kamera Depan/Belakang"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}

                        <Link
                            href="/settings"
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                                url === '/settings'
                                    ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(107,216,203,0.4)]'
                                    : 'bg-surface-container-high/80 text-on-surface-variant hover:text-primary active:scale-95'
                            }`}
                            title="Pengaturan & Kalibrasi"
                        >
                            <Sliders className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </header>

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
