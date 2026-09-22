import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { BookmarkPlus, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function SaveSessionModal({
    isOpen,
    onClose,
    onSaved,
    sessionData,
}) {
    if (!isOpen || !sessionData) return null;

    const { props } = usePage();
    const user = props?.auth?.user;

    const [prescriptionNo, setPrescriptionNo] = useState(
        'RX-' + Math.floor(100000 + Math.random() * 900000)
    );
    const [medicineName, setMedicineName] = useState('');
    const [pharmacistName, setPharmacistName] = useState(
        user?.name || localStorage.getItem('pillcount_operator') || 'Petugas Farmasi'
    );
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!medicineName.trim()) {
            setErrorMsg('Harap masukkan nama obat.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            localStorage.setItem('pillcount_operator', pharmacistName);

            const payload = {
                prescription_no: prescriptionNo,
                medicine_name: medicineName.trim(),
                pharmacist_name: pharmacistName.trim(),
                shape_filter: sessionData.shape || 'all',
                auto_count: sessionData.autoCount,
                manual_count: sessionData.manualCount,
                confidence_score: sessionData.confidence || 98.5,
                lighting_quality: sessionData.quality?.lighting || 'optimal',
                blur_score: sessionData.quality?.blur_score || null,
                raw_image: sessionData.rawImage || null,
                annotated_image: sessionData.annotatedImage || null,
                detected_items: sessionData.pills || [],
                notes: notes.trim(),
            };

            const res = await axios.post('/api/sessions', payload);

            if (res.data.success) {
                try {
                    confetti({
                        particleCount: 50,
                        spread: 60,
                        origin: { y: 0.7 },
                        colors: ['#6bd8cb', '#94de2d', '#ffb95f'],
                    });
                } catch (err) {}

                if (onSaved) {
                    onSaved(res.data.session);
                }
                onClose();
            } else {
                setErrorMsg(res.data.error || 'Gagal menyimpan sesi verifikasi.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-surface-container-high border border-surface-container-highest rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-surface-container-highest/60 flex items-center justify-between bg-surface-container-high/90">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <BookmarkPlus className="w-4 h-4" />
                        </div>
                        <h2 className="font-headline-sm text-sm font-bold text-on-surface">
                            Simpan Sesi Hitung
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
                    {errorMsg && (
                        <div className="p-2.5 rounded-xl bg-error-container/40 border border-error/30 text-error text-[11px] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Pill count summary card */}
                    <div className="p-3 rounded-xl bg-surface-container-lowest/70 border border-surface-container-highest/50 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-label-code text-on-surface-variant block uppercase tracking-wider">
                                HASIL VERIFIKASI
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-display-count text-2xl text-primary font-bold">
                                    {sessionData.manualCount}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">Butir Terkonfirmasi</span>
                            </div>
                            {sessionData.manualCount !== sessionData.autoCount && (
                                <span className="text-[10px] text-tertiary">
                                    (Otomatis: {sessionData.autoCount} butir)
                                </span>
                            )}
                        </div>

                        {sessionData.annotatedImage ? (
                            <img
                                src={sessionData.annotatedImage}
                                alt="Tray preview"
                                className="w-12 h-12 rounded-lg object-cover border border-primary/30"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        )}
                    </div>

                    {/* Prescription No & Medicine Name */}
                    <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Nomor Resep / ID Obat
                        </label>
                        <input
                            type="text"
                            value={prescriptionNo}
                            onChange={(e) => setPrescriptionNo(e.target.value)}
                            placeholder="Contoh: RX-948122"
                            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Nama Obat <span className="text-error">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={medicineName}
                            onChange={(e) => setMedicineName(e.target.value)}
                            placeholder="Contoh: Paracetamol 500mg"
                            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Petugas / Tenaga Teknis Kefarmasian (TTK)
                        </label>
                        <input
                            type="text"
                            value={pharmacistName}
                            onChange={(e) => setPharmacistName(e.target.value)}
                            placeholder="Nama Apoteker / TTK"
                            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Catatan Peracikan / Batch
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Catatan racikan"
                            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Simpan Hasil</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
