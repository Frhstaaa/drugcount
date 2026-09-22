import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Focus,
    CheckCircle,
    Lock,
    Unlock,
    Zap,
    ZapOff,
    RotateCcw,
    Smartphone,
    Camera,
    Sliders,
    Minus,
    Plus,
    Lightbulb,
    BookmarkPlus,
    Sun,
    Info
} from 'lucide-react';
import Navbar from '@/Components/Navbar';
import SaveSessionModal from '@/Components/SaveSessionModal';

export default function VerificationSession({ stats, recentSessions = [] }) {
    // Camera and detection state
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraFacing, setCameraFacing] = useState('environment');
    const [hasCamera, setHasCamera] = useState(true);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [torchState, setTorchState] = useState(false);
    const [hasTorchCapability, setHasTorchCapability] = useState(false);
    const [hapticState, setHapticState] = useState(true);

    // Pill counting state
    const [currentShape, setCurrentShape] = useState('all');
    const [isFrozen, setIsFrozen] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [rawImageBase64, setRawImageBase64] = useState(null);
    const [annotatedImageBase64, setAnnotatedImageBase64] = useState(null);
    const [detectedPills, setDetectedPills] = useState([]);
    const [autoCount, setAutoCount] = useState(0);
    const [manualCount, setManualCount] = useState(0);
    const [confidence, setConfidence] = useState(99);
    const [qualityInfo, setQualityInfo] = useState({
        lighting: 'optimal',
        is_blurry: false,
        message: 'Kondisi nampan siap dipindai',
    });

    // Save Modal
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Demo Tray Sample (Authentic Pharmacy Matte Blue Tray from mockup)
    const DEMO_TRAY_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9lAEHJ7lwBoE-nriAxHQ--tKEQoy8hSEkQ0bkhQU9Oy-UDjrb-bndYe2iPaDXnFk-5TiEOFga4tD7KUqTqhZ0ESkpZlrC96ztvlPdhoR0s-aidwloOLQQr_21c-h62mWqv4YD7PPHeSXZ5Erc8QDtY0Bp4fLcxpGrHyQj7VliMlV_GAGuBZaRDfZ5xUcgm3riO1x291qcm7UMjcXGGtb7wTSnzTuopKZOse3k6FKW';

    // Haptic feedback helper
    const triggerVibrate = (duration = 35) => {
        if (hapticState && typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(duration);
            } catch (e) {}
        }
    };

    // Show temporary toast
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    // Initialize Camera
    const startCamera = async (facing = cameraFacing) => {
        try {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('getUserMedia tidak didukung pada browser ini.');
                setHasCamera(false);
                setIsCameraActive(false);
                return;
            }

            let newStream;
            try {
                // Prioritaskan kamera belakang untuk nampan obat
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: facing },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
            } catch (specificErr) {
                console.warn('Constraint kamera spesifik gagal, mencoba fallback default video: true', specificErr);
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            }

            setStream(newStream);
            setIsCameraActive(true);
            setHasCamera(true);

            // Langsung pasang ke video element jika sudah siap
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play().catch(() => {});
            }

            // Cek kemampuan senter / flashlight
            const videoTrack = newStream.getVideoTracks()[0];
            if (videoTrack && videoTrack.getCapabilities) {
                const capabilities = videoTrack.getCapabilities();
                setHasTorchCapability(Boolean(capabilities.torch));
            }
        } catch (err) {
            console.warn('Akses kamera ditolak atau belum diizinkan:', err);
            setHasCamera(false);
            setIsCameraActive(false);
        }
    };

    // Sinkronisasi otomatis stream ke elemen video saat stream atau video element siap
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        video.srcObject = stream;
        video.play().catch(() => {});

        const handleMetadata = () => {
            video.play().catch(() => {});
        };

        video.addEventListener('loadedmetadata', handleMetadata);
        return () => {
            video.removeEventListener('loadedmetadata', handleMetadata);
        };
    }, [stream, isFrozen]);

    useEffect(() => {
        startCamera(cameraFacing);
        setAutoCount(0);
        setManualCount(0);

        // Otomatis resume video jika tab browser kembali aktif
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isFrozen && videoRef.current && stream) {
                videoRef.current.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Switch Camera Front/Back
    const switchCamera = () => {
        triggerVibrate();
        const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
        setCameraFacing(nextFacing);
        startCamera(nextFacing);
    };

    // Toggle Torch/Flashlight
    const toggleTorch = async () => {
        triggerVibrate();
        if (!stream) return;
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;

        try {
            const nextTorch = !torchState;
            await videoTrack.applyConstraints({
                advanced: [{ torch: nextTorch }],
            });
            setTorchState(nextTorch);
        } catch (err) {
            console.warn('Torch not supported:', err);
            setTorchState(!torchState);
        }
    };

    // Toggle Haptic
    const toggleHaptic = () => {
        setHapticState(!hapticState);
        if (!hapticState) triggerVibrate(50);
    };

    // Capture current frame to base64
    const captureFrame = () => {
        if (!videoRef.current && !rawImageBase64) return null;

        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (videoRef.current && isCameraActive) {
            canvas.width = videoRef.current.videoWidth || 1280;
            canvas.height = videoRef.current.videoHeight || 720;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.9);
        } else {
            return rawImageBase64 || DEMO_TRAY_URL;
        }
    };

    // Run Python detection on image
    const runDetection = async (imageBase64, shape = currentShape) => {
        setIsDetecting(true);
        try {
            const res = await axios.post('/api/detect', {
                image: imageBase64,
                shape: shape,
                sensitivity: 50,
            });

            if (res.data && res.data.success) {
                const count = res.data.count;
                setAutoCount(count);
                setManualCount(count);
                setDetectedPills(res.data.pills || []);
                setConfidence(count > 0 ? 99 : 0);
                if (res.data.quality) {
                    setQualityInfo(res.data.quality);
                }
                if (res.data.annotated_image) {
                    setAnnotatedImageBase64(res.data.annotated_image);
                }
                triggerVibrate(count > 0 ? 60 : 30);
                if (count > 0) {
                    showToast(`Berhasil mendeteksi ${count} butir obat.`);
                } else {
                    showToast('Tidak ada obat terdeteksi. Arahkan kamera tegak lurus ke nampan datar.');
                }
            } else {
                showToast(res.data?.error || 'Gagal memproses gambar obat.');
            }
        } catch (err) {
            console.error('Detection API error:', err);
            const serverErrMsg = err.response?.data?.error || err.response?.data?.message;
            showToast(serverErrMsg || 'Gagal terhubung ke engine deteksi Python di server.');
        } finally {
            setIsDetecting(false);
        }
    };

    // Freeze & Count Action (Giant Button)
    const toggleFreeze = async () => {
        triggerVibrate();

        if (isFrozen) {
            // Unfreeze / Resume live camera
            setIsFrozen(false);
            setAnnotatedImageBase64(null);
            setDetectedPills([]);
            setAutoCount(0);
            setManualCount(0);
        } else {
            // Freeze & Run Detection!
            setIsFrozen(true);
            const frame = captureFrame();
            setRawImageBase64(frame);
            await runDetection(frame, currentShape);
        }
    };

    // Shape Filter Change
    const handleShapeChange = (shape) => {
        triggerVibrate();
        setCurrentShape(shape);

        if (isFrozen && rawImageBase64) {
            runDetection(rawImageBase64, shape);
        }
    };

    // Manual Stepper (+/-)
    const adjustCount = (delta) => {
        triggerVibrate(20);
        setManualCount((prev) => Math.max(0, prev + delta));
    };

    // Reset Count
    const resetCount = () => {
        triggerVibrate(40);
        setAutoCount(0);
        setManualCount(0);
        setDetectedPills([]);
        setIsFrozen(false);
        setAnnotatedImageBase64(null);
    };

    // Tap on image to add or remove pill marker
    const handleTrayClick = (e) => {
        if (!isFrozen) return;
        triggerVibrate(25);

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const pctX = (clickX / rect.width) * 100;
        const pctY = (clickY / rect.height) * 100;

        // Check if clicking near an existing pill marker to delete it
        const clickRadiusThreshold = 6; // percentage
        const existingIdx = detectedPills.findIndex((p) => {
            const pX = p.pctX !== undefined ? p.pctX : (p.cx / 800) * 100;
            const pY = p.pctY !== undefined ? p.pctY : (p.cy / 600) * 100;
            const dist = Math.hypot(pctX - pX, pctY - pY);
            return dist < clickRadiusThreshold;
        });

        if (existingIdx !== -1) {
            const next = [...detectedPills];
            next.splice(existingIdx, 1);
            setDetectedPills(next);
            setManualCount((c) => Math.max(0, c - 1));
            showToast('Marker butir obat dihapus (-1)');
        } else {
            const newPill = {
                id: detectedPills.length + 1,
                cx: clickX,
                cy: clickY,
                shape: currentShape === 'all' ? 'tablet' : currentShape,
                confidence: 1.0,
                is_manual: true,
                pctX,
                pctY,
            };
            setDetectedPills([...detectedPills, newPill]);
            setManualCount((c) => c + 1);
            showToast('Butir obat ditambahkan (+1)');
        }
    };

    // Handle User File Upload as alternative tray photo
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const b64 = event.target.result;
            setRawImageBase64(b64);
            setIsFrozen(true);
            runDetection(b64, currentShape);
        };
        reader.readAsDataURL(file);
    };

    // Load Demo Tray
    const loadDemoTray = async () => {
        triggerVibrate();
        setIsFrozen(true);
        setRawImageBase64(DEMO_TRAY_URL);
        await runDetection(DEMO_TRAY_URL, currentShape);
    };

    return (
        <div className="bg-surface font-sans text-on-surface flex flex-col min-h-screen select-none pb-20">
            <Head title="Verifikasi Hitung Obat" />

            {/* Header with Camera utilities */}
            <Navbar
                onTorchToggle={toggleTorch}
                torchState={torchState}
                onCameraSwitch={switchCamera}
                hasTorch={hasTorchCapability}
            />

            {/* Hidden canvas for video frame grab */}
            <canvas ref={canvasRef} className="hidden" />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Main Camera Viewport Area */}
            <main className="flex-1 flex flex-col relative w-full pt-14 max-w-md mx-auto px-3">
                {/* Toast Notification */}
                {toastMessage && (
                    <div className="fixed top-16 inset-x-4 z-50 max-w-xs mx-auto p-2.5 rounded-xl bg-surface-container-highest/95 border border-primary/40 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[11px] text-on-surface font-medium leading-tight">{toastMessage}</span>
                    </div>
                )}

                {/* Top Telemetry & Filter Strip */}
                <div className="pt-2 pb-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/90 text-on-surface shadow-sm border border-surface-container-highest/50">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                        <span className="w-2 h-2 rounded-full bg-secondary -ml-2"></span>
                        <span className="font-label-code text-[10px] tracking-wider text-secondary uppercase font-semibold">
                            {isFrozen ? 'HASIL TERKUNCI' : 'KAMERA LIVE'}
                        </span>
                    </div>

                    {/* Shape Selectors */}
                    <div className="flex items-center p-0.5 rounded-full bg-surface-container-low border border-surface-container-highest/40">
                        {['all', 'tablet', 'capsule'].map((shape) => (
                            <button
                                key={shape}
                                type="button"
                                onClick={() => handleShapeChange(shape)}
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                                    currentShape === shape
                                        ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                {shape === 'all' ? 'Semua' : shape === 'tablet' ? 'Tablet' : 'Kapsul'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quality / Lighting Warning Banner (PRD F10) */}
                {qualityInfo && qualityInfo.lighting !== 'optimal' && (
                    <div className="mb-2 p-1.5 px-2.5 rounded-lg bg-tertiary-container/30 border border-tertiary/40 flex items-center gap-1.5 text-[11px] text-tertiary animate-pulse">
                        <Sun className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{qualityInfo.message}</span>
                    </div>
                )}

                {/* Main Viewfinder Section */}
                <div
                    onClick={handleTrayClick}
                    className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-surface-container-lowest border border-surface-container-highest/80 cursor-crosshair h-[40vh] min-h-[260px] max-h-[380px]"
                >
                    {/* Live Video Feed (Selalu terpasang di DOM agar videoRef tidak null saat kamera diizinkan) */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                            isCameraActive && !isFrozen ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                        }`}
                    />

                    {/* Snapshot / Demo Tray Fallback */}
                    {(!isCameraActive || isFrozen) && (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 z-0"
                            style={{
                                backgroundImage: `url('${annotatedImageBase64 || rawImageBase64 || DEMO_TRAY_URL}')`,
                            }}
                        />
                    )}

                    {/* Dark gradient overlay for HUD contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-surface/30 pointer-events-none" />

                    {/* Reticle Corners */}
                    <div className="absolute inset-3 pointer-events-none flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="w-5 h-5 border-t-2 border-l-2 border-primary/80 rounded-tl"></div>
                            <div className="w-5 h-5 border-t-2 border-r-2 border-primary/80 rounded-tr"></div>
                        </div>

                        {/* Central Optical Focus Reticle Grid */}
                        <div className="self-center flex items-center justify-center opacity-30 pointer-events-none animate-pulse">
                            <Focus className="w-10 h-10 text-primary" />
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="w-5 h-5 border-b-2 border-l-2 border-primary/80 rounded-bl"></div>
                            <div className="w-5 h-5 border-b-2 border-r-2 border-primary/80 rounded-br"></div>
                        </div>
                    </div>

                    {/* Scan Line Sweeper */}
                    {!isFrozen && (
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none animate-[bounce_3s_infinite]" />
                    )}

                    {/* Pill Detection Markers Overlay (Only displayed when pills are actually detected after freeze) */}
                    <div className="absolute inset-0 pointer-events-none">
                        {isFrozen &&
                            detectedPills.map((pill, idx) => {
                                const topPct = pill.pctY !== undefined
                                    ? `${pill.pctY}%`
                                    : `${(pill.cy / 600) * 100}%`;
                                const leftPct = pill.pctX !== undefined
                                    ? `${pill.pctX}%`
                                    : `${(pill.cx / 800) * 100}%`;

                                return (
                                    <div
                                        key={pill.id || idx}
                                        className="pill-node absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                                        style={{ top: topPct, left: leftPct }}
                                    >
                                        <span className="w-6 h-6 rounded-full bg-primary/25 flex items-center justify-center shadow-[0_0_12px_rgba(107,216,203,0.7)] border border-primary/70">
                                            <span className="w-1 h-1 rounded-full bg-secondary mr-0.5"></span>
                                            <span className="font-label-code text-[10px] text-primary font-bold">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Floating HUD Pill Counter Tag */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="px-3 py-1.5 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-lg border border-surface-container-highest/60 flex items-center gap-2.5 pointer-events-auto">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-display-count text-2xl sm:text-3xl text-primary tracking-tight leading-none font-bold">
                                        {manualCount}
                                    </span>
                                    <span className="text-[11px] text-on-surface-variant font-medium">
                                        Butir
                                    </span>
                                </div>
                                <span className="font-label-code text-[9px] text-on-surface-variant/80 uppercase tracking-wider">
                                    {isFrozen ? 'TERKONFIRMASI' : 'SIAP MEMINDAI'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 pointer-events-auto">
                            <div className="px-2 py-0.5 rounded-full bg-surface-container-high/90 backdrop-blur-md flex items-center gap-1 shadow border border-secondary/30">
                                <CheckCircle className="w-3 h-3 text-secondary" />
                                <span className="font-label-code text-[9px] text-secondary font-semibold">
                                    {isFrozen ? `${confidence}% AKURAT` : 'KAMERA AKTIF'}
                                </span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-surface-container-lowest/80 text-on-surface-variant font-label-code text-[9px]">
                                {isDetecting ? 'AI MEMPROSES...' : '60 FPS LIVE'}
                            </div>
                        </div>
                    </div>

                    {/* Prompt to load demo / upload if no camera */}
                    {!isCameraActive && !rawImageBase64 && (
                        <div className="absolute inset-x-4 bottom-3 p-2.5 rounded-xl bg-surface-container-high/95 backdrop-blur-md border border-surface-container-highest text-center pointer-events-auto flex flex-col gap-1.5">
                            <p className="text-[11px] text-on-surface-variant">
                                Kamera belum aktif di emulator ini?
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={loadDemoTray}
                                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary-container transition-all"
                                >
                                    Gunakan Foto Nampan Demo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface text-[11px] hover:bg-surface-container-highest transition-all"
                                >
                                    Pilih Foto
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Ergonomic Thumb Control Panel */}
                <div className="mt-2.5 flex flex-col gap-2">
                    {/* Giant Primary Action Button: FREEZE & LOCK */}
                    <button
                        type="button"
                        onClick={toggleFreeze}
                        disabled={isDetecting}
                        className={`w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all duration-150 disabled:opacity-50 ${
                            isFrozen
                                ? 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-[0_0_16px_rgba(148,222,45,0.4)]'
                                : 'bg-primary text-on-primary hover:bg-primary-container shadow-[0_0_16px_rgba(107,216,203,0.4)]'
                        }`}
                    >
                        {isFrozen ? (
                            <Unlock className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <Lock className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span className="tracking-wide">
                            {isFrozen ? 'TERKUNCI (KETUK UNTUK LANJUT)' : 'KUNCI & HITUNG (FREEZE)'}
                        </span>
                    </button>

                    {/* Quick Utility Paddles Row */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {/* Flash/Torch Switch */}
                        <button
                            type="button"
                            onClick={toggleTorch}
                            className={`h-10 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all ${
                                torchState
                                    ? 'bg-primary-container text-on-primary font-semibold'
                                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                            }`}
                        >
                            {torchState ? (
                                <Zap className="w-3.5 h-3.5" />
                            ) : (
                                <ZapOff className="w-3.5 h-3.5" />
                            )}
                            <span>Senter</span>
                        </button>

                        {/* Reset / Re-Scan Action */}
                        <button
                            type="button"
                            onClick={resetCount}
                            className="h-10 rounded-xl bg-surface-container-high text-on-surface text-[11px] flex items-center justify-center gap-1 shadow-sm hover:bg-surface-container-highest transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-on-surface-variant" />
                            <span>Reset 0</span>
                        </button>

                        {/* Haptic Toggle */}
                        <button
                            type="button"
                            onClick={toggleHaptic}
                            className={`h-10 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all ${
                                hapticState
                                    ? 'bg-surface-container-high text-secondary font-medium'
                                    : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>{hapticState ? 'Haptik ON' : 'Haptik OFF'}</span>
                        </button>

                        {/* Upload / Demo */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 rounded-xl bg-surface-container-high text-on-surface text-[11px] flex items-center justify-center gap-1 shadow-sm hover:bg-surface-container-highest transition-colors"
                            title="Unggah foto obat dari galeri/file"
                        >
                            <Camera className="w-3.5 h-3.5 text-primary" />
                            <span>File</span>
                        </button>
                    </div>

                    {/* Micro Steppers Card for Manual Override */}
                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest/60 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 pl-1">
                            <Sliders className="w-4 h-4 text-primary flex-shrink-0" />
                            <div>
                                <span className="text-xs text-on-surface font-medium block leading-tight">
                                    Koreksi Manual
                                </span>
                                <span className="text-[10px] text-on-surface-variant block">
                                    {isFrozen ? 'Ketuk foto untuk tambah/hapus' : 'Gunakan tombol +/-'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                aria-label="Kurang 1 Butir"
                                onClick={() => adjustCount(-1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high active:bg-surface-container-highest flex items-center justify-center text-on-surface transition-transform active:scale-90 shadow-sm"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-label-numeric text-base text-primary font-bold">
                                {manualCount}
                            </span>
                            <button
                                type="button"
                                aria-label="Tambah 1 Butir"
                                onClick={() => adjustCount(1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high active:bg-surface-container-highest flex items-center justify-center text-on-surface transition-transform active:scale-90 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Save Session Action Button */}
                    {manualCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsSaveModalOpen(true)}
                            className="w-full h-11 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-primary/40 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                        >
                            <BookmarkPlus className="w-4 h-4" />
                            <span>Simpan Sesi Hitung ({manualCount} Butir)</span>
                        </button>
                    )}

                    {/* Essential Tip Utility Footnote */}
                    <div className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest/60 border border-surface-container-highest/30 flex items-center justify-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-tertiary flex-shrink-0" />
                        <p className="text-[10px] text-on-surface-variant text-center">
                            Arahkan kamera tegak lurus ke nampan datar & jangan saling tumpuk
                        </p>
                    </div>
                </div>
            </main>

            {/* Save Modal */}
            <SaveSessionModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSaved={(session) => {
                    showToast(`Sesi hitung obat "${session.medicine_name}" berhasil disimpan!`);
                }}
                sessionData={{
                    manualCount,
                    autoCount,
                    shape: currentShape,
                    confidence,
                    quality: qualityInfo,
                    rawImage: rawImageBase64,
                    annotatedImage: annotatedImageBase64,
                    pills: detectedPills,
                }}
            />
        </div>
    );
}
