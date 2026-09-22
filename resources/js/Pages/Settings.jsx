import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { 
    CheckCircle, 
    Cpu, 
    RefreshCw, 
    User, 
    Sliders, 
    Vibrate, 
    Save, 
    AlertTriangle 
} from 'lucide-react';
import Navbar from '@/Components/Navbar';

export default function Settings() {
    const [operatorName, setOperatorName] = useState(
        localStorage.getItem('pillcount_operator') || 'Apt. Sarah Pratama, S.Farm'
    );
    const [sensitivity, setSensitivity] = useState(
        parseInt(localStorage.getItem('pillcount_sensitivity') || '50')
    );
    const [minArea, setMinArea] = useState(
        parseInt(localStorage.getItem('pillcount_min_area') || '120')
    );
    const [soundEnabled, setSoundEnabled] = useState(
        localStorage.getItem('pillcount_sound') !== 'false'
    );
    const [hapticEnabled, setHapticEnabled] = useState(
        localStorage.getItem('pillcount_haptic') !== 'false'
    );
    const [engineStatus, setEngineStatus] = useState('checking');
    const [engineInfo, setEngineInfo] = useState(null);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const checkEngine = async () => {
        setEngineStatus('checking');
        try {
            const res = await axios.get('http://127.0.0.1:5175/health', { timeout: 1500 });
            if (res.data?.status === 'online') {
                setEngineStatus('daemon_online');
                setEngineInfo(res.data);
                return;
            }
        } catch (e) {
            setEngineStatus('cli_ready');
            setEngineInfo({
                status: 'ready',
                mode: 'Python CLI Subprocess (Bawaan)',
                version: 'OpenCV 5.0.0',
            });
        }
    };

    useEffect(() => {
        checkEngine();
    }, []);

    const saveSettings = () => {
        localStorage.setItem('pillcount_operator', operatorName);
        localStorage.setItem('pillcount_sensitivity', sensitivity.toString());
        localStorage.setItem('pillcount_min_area', minArea.toString());
        localStorage.setItem('pillcount_sound', soundEnabled.toString());
        localStorage.setItem('pillcount_haptic', hapticEnabled.toString());
        showToast('Pengaturan berhasil disimpan!');
    };

    return (
        <div className="bg-surface font-sans text-on-surface flex flex-col min-h-screen select-none pb-20">
            <Head title="Pengaturan & Kalibrasi" />
            <Navbar />

            <main className="flex-1 flex flex-col w-full pt-16 px-3 max-w-md mx-auto space-y-3">
                {/* Toast */}
                {toastMessage && (
                    <div className="fixed top-16 inset-x-4 z-50 max-w-xs mx-auto p-2.5 rounded-xl bg-surface-container-highest/95 border border-primary/40 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[11px] text-on-surface font-medium">{toastMessage}</span>
                    </div>
                )}

                <div>
                    <h1 className="font-headline-lg text-lg font-bold text-on-surface tracking-tight">
                        Kalibrasi & Pengaturan
                    </h1>
                    <p className="text-[11px] text-on-surface-variant">
                        Konfigurasi computer vision & identitas apotek
                    </p>
                </div>

                {/* Python CV Engine Status Card */}
                <div className="p-3 rounded-2xl bg-surface-container-high border border-surface-container-highest/80 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-headline-sm text-xs font-semibold text-on-surface">
                                    Status Python (OpenCV)
                                </h3>
                                <span className="text-[10px] text-on-surface-variant">
                                    Watershed & kontur obat
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest border border-surface-container-highest">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    engineStatus === 'daemon_online'
                                        ? 'bg-secondary animate-ping'
                                        : 'bg-primary'
                                }`}
                            />
                            <span className="text-[9px] font-label-code font-bold uppercase text-primary">
                                {engineStatus === 'daemon_online'
                                    ? 'DAEMON AKTIF'
                                    : engineStatus === 'cli_ready'
                                    ? 'MODE CLI AKTIF'
                                    : 'CEK...'}
                            </span>
                        </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 text-[11px] text-on-surface-variant space-y-1">
                        <div className="flex justify-between">
                            <span>Metode:</span>
                            <strong className="text-on-surface">
                                {engineStatus === 'daemon_online'
                                    ? 'HTTP Microservice (:5175)'
                                    : 'Python 3.14 + OpenCV 5.0 (CLI)'}
                            </strong>
                        </div>
                        <div className="flex justify-between">
                            <span>Algoritma:</span>
                            <span className="text-primary font-medium">
                                Watershed Segmentation
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={checkEngine}
                        className="w-full py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-[11px] font-semibold text-on-surface flex items-center justify-center gap-1 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Tes Ulang Koneksi Engine</span>
                    </button>
                </div>

                {/* Operator Profile */}
                <div className="p-3 rounded-2xl bg-surface-container-high border border-surface-container-highest/80 shadow-sm space-y-2">
                    <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="font-headline-sm text-xs font-semibold text-on-surface">
                            Identitas Petugas / Operator
                        </h3>
                    </div>

                    <div>
                        <input
                            type="text"
                            value={operatorName}
                            onChange={(e) => setOperatorName(e.target.value)}
                            placeholder="Contoh: Apt. Sarah Pratama, S.Farm"
                            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors"
                        />
                        <span className="text-[10px] text-on-surface-variant mt-1 block">
                            Otomatis terisi saat menyimpan sesi verifikasi obat.
                        </span>
                    </div>
                </div>

                {/* Vision Calibration Sliders */}
                <div className="p-3 rounded-2xl bg-surface-container-high border border-surface-container-highest/80 shadow-sm space-y-3">
                    <div className="flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h3 className="font-headline-sm text-xs font-semibold text-on-surface">
                            Kalibrasi Computer Vision
                        </h3>
                    </div>

                    {/* Sensitivity */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-on-surface font-medium text-[11px]">
                                Sensitivitas Pemisahan (Watershed)
                            </span>
                            <span className="font-label-code text-primary font-bold text-xs">
                                {sensitivity}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="20"
                            max="90"
                            value={sensitivity}
                            onChange={(e) => setSensitivity(parseInt(e.target.value))}
                            className="w-full accent-primary h-1.5 bg-surface-container-lowest rounded-lg cursor-pointer"
                        />
                    </div>

                    {/* Min Area */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-on-surface font-medium text-[11px]">
                                Filter Debu/Serbuk Obat
                            </span>
                            <span className="font-label-code text-primary font-bold text-xs">
                                {minArea} px²
                            </span>
                        </div>
                        <input
                            type="range"
                            min="40"
                            max="400"
                            step="20"
                            value={minArea}
                            onChange={(e) => setMinArea(parseInt(e.target.value))}
                            className="w-full accent-primary h-1.5 bg-surface-container-lowest rounded-lg cursor-pointer"
                        />
                    </div>
                </div>

                {/* Feedback Preferences */}
                <div className="p-3 rounded-2xl bg-surface-container-high border border-surface-container-highest/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Vibrate className="w-4 h-4 text-secondary" />
                            <span className="text-xs font-medium text-on-surface">
                                Getaran Haptik
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={hapticEnabled}
                            onChange={(e) => setHapticEnabled(e.target.checked)}
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <button
                    type="button"
                    onClick={saveSettings}
                    className="w-full h-10 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all"
                >
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan</span>
                </button>

                {/* Disclaimer */}
                <div className="p-2.5 rounded-xl bg-surface-container-lowest/50 border border-surface-container-highest/40 text-[10px] text-on-surface-variant/80 text-center leading-normal">
                    <span className="font-semibold text-tertiary block mb-0.5">
                        ⚠️ Alat Bantu Verifikasi (PRD Sec. 12)
                    </span>
                    Hasil hitung tetap wajib diverifikasi oleh tenaga teknis kefarmasian sebelum obat diserahkan kepada pasien.
                </div>
            </main>
        </div>
    );
}
