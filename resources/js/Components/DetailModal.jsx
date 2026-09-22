import React from 'react';
import { Pill, X, CheckCircle, Printer, Trash2, User, Clock, FileText, ImageOff } from 'lucide-react';

export default function DetailModal({ session, isOpen, onClose, onDelete }) {
    if (!isOpen || !session) return null;

    const printSlip = () => {
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Slip Verifikasi Hitung Obat - ${session.prescription_no}</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 13px;
                        padding: 20px;
                        max-width: 400px;
                        margin: 0 auto;
                        color: #111;
                    }
                    .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 18px; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .row { display: flex; justify-content: space-between; margin: 4px 0; }
                    .total { border-top: 1px dashed #333; border-bottom: 2px solid #333; padding: 8px 0; margin: 12px 0; }
                    .total .count { font-size: 20px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #555; }
                    img { max-width: 100%; height: auto; border: 1px solid #ccc; margin: 10px 0; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>PILLCOUNT APOTEK</h2>
                    <p>Sistem Verifikasi Hitung Obat Terotomasi</p>
                    <p>${new Date(session.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div class="row"><span>No. Resep:</span><strong>${session.prescription_no || '-'}</strong></div>
                <div class="row"><span>Nama Obat:</span><strong>${session.medicine_name}</strong></div>
                <div class="row"><span>Bentuk:</span><span>${session.shape_filter?.toUpperCase()}</span></div>
                <div class="row"><span>Petugas TTK:</span><span>${session.pharmacist_name || '-'}</span></div>
                ${session.notes ? `<div class="row"><span>Catatan:</span><span>${session.notes}</span></div>` : ''}
                
                <div class="total">
                    <div class="row"><span>Hitungan Otomatis:</span><span>${session.auto_count} butir</span></div>
                    <div class="row"><span>Koreksi Manual:</span><span>${session.manual_count - session.auto_count >= 0 ? '+' : ''}${session.manual_count - session.auto_count} butir</span></div>
                    <div class="row" style="margin-top:6px;"><span style="font-weight:bold;">JUMLAH AKHIR:</span><span class="count">${session.manual_count} BUTIR</span></div>
                </div>

                ${session.annotated_image_path ? `<img src="${window.location.origin}${session.annotated_image_path}" alt="Foto Bukti Hitung" />` : ''}

                <div class="footer">
                    <p>*** DIVERIFIKASI RESMI OLEH PETUGAS ***</p>
                    <p>Simpan tanda bukti ini bersama berkas resep.</p>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-surface-container-high border border-surface-container-highest rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-surface-container-highest/60 flex items-center justify-between bg-surface-container-high/95">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Pill className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-headline-sm text-sm font-bold text-on-surface leading-tight">
                                {session.medicine_name}
                            </h2>
                            <span className="font-label-code text-[10px] text-primary font-semibold">
                                {session.prescription_no || 'ID Sesi: #' + session.id}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
                    {/* Image Preview with overlay markers */}
                    <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest border border-surface-container-highest flex items-center justify-center min-h-[160px] max-h-[220px]">
                        {session.annotated_image_path || session.image_path ? (
                            <img
                                src={session.annotated_image_path || session.image_path}
                                alt="Foto nampan obat"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="p-6 text-center text-on-surface-variant text-[11px] flex flex-col items-center gap-1.5">
                                <ImageOff className="w-8 h-8 opacity-40" />
                                <span>Foto nampan tersimpan sebagai metadata</span>
                            </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-[10px] font-label-code text-secondary font-bold flex items-center gap-1 border border-secondary/30">
                            <CheckCircle className="w-3 h-3" />
                            <span>{session.manual_count} BUTIR</span>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 border border-surface-container-highest/40">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                HITUNGAN OTOMATIS
                            </span>
                            <span className="font-display-count text-lg text-primary font-bold block mt-0.5">
                                {session.auto_count} Butir
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 border border-surface-container-highest/40">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                VERIFIKASI AKHIR
                            </span>
                            <span className="font-display-count text-lg text-secondary font-bold block mt-0.5">
                                {session.manual_count} Butir
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 border border-surface-container-highest/40">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                PETUGAS / TTK
                            </span>
                            <span className="text-xs font-medium text-on-surface block mt-0.5 truncate">
                                {session.pharmacist_name || 'Petugas'}
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 border border-surface-container-highest/40">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                WAKTU
                            </span>
                            <span className="text-[11px] font-medium text-on-surface block mt-0.5">
                                {new Date(session.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    </div>

                    {session.notes && (
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest/60 border border-surface-container-highest/40">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                CATATAN
                            </span>
                            <p className="text-[11px] text-on-surface mt-0.5 whitespace-pre-line">
                                {session.notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-3.5 py-2.5 border-t border-surface-container-highest/60 bg-surface-container-high/90 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => onDelete && onDelete(session.id)}
                        className="px-2.5 h-9 rounded-xl bg-error-container/20 hover:bg-error-container/40 text-error text-xs flex items-center gap-1 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={printSlip}
                            className="px-3 h-9 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs flex items-center gap-1 transition-colors shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Slip</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 h-9 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
