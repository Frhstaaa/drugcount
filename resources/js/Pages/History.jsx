import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { 
    CheckCircle, 
    Camera, 
    Search, 
    Inbox, 
    Scan, 
    Pill, 
    User, 
    Clock 
} from 'lucide-react';
import Navbar from '@/Components/Navbar';
import DetailModal from '@/Components/DetailModal';

export default function History({ sessions, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [selectedShape, setSelectedShape] = useState(filters?.shape || 'all');
    const [selectedSession, setSelectedSession] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [sessionList, setSessionList] = useState(sessions?.data || []);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            '/history',
            { search, shape: selectedShape },
            { preserveState: true, replace: true }
        );
    };

    const handleShapeFilter = (shape) => {
        setSelectedShape(shape);
        router.get(
            '/history',
            { search, shape },
            { preserveState: true, replace: true }
        );
    };

    const handleOpenDetail = (session) => {
        setSelectedSession(session);
        setIsDetailOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus arsip sesi verifikasi ini?')) return;

        try {
            const res = await axios.delete(`/api/sessions/${id}`);
            if (res.data.success) {
                setSessionList(sessionList.filter((s) => s.id !== id));
                setIsDetailOpen(false);
                showToast('Riwayat sesi berhasil dihapus.');
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus riwayat.');
        }
    };

    const totalPillsInView = sessionList.reduce((acc, s) => acc + (s.manual_count || 0), 0);

    return (
        <div className="bg-surface font-sans text-on-surface flex flex-col min-h-screen select-none pb-20">
            <Head title="Riwayat Sesi Hitung Obat" />
            <Navbar />

            <main className="flex-1 flex flex-col w-full pt-16 px-3 max-w-md mx-auto space-y-3.5">
                {/* Toast */}
                {toastMessage && (
                    <div className="fixed top-16 inset-x-4 z-50 max-w-xs mx-auto p-2.5 rounded-xl bg-surface-container-highest/95 border border-primary/40 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-[11px] text-on-surface font-medium">{toastMessage}</span>
                    </div>
                )}

                {/* Page Title & Stats Cards */}
                <div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="font-headline-lg text-lg font-bold text-on-surface tracking-tight">
                                Riwayat Verifikasi
                            </h1>
                            <p className="text-[11px] text-on-surface-variant">
                                Arsip penghitungan obat via kamera
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="px-2.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1 shadow-md hover:bg-primary-container active:scale-95 transition-all"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Sesi Baru</span>
                        </Link>
                    </div>

                    {/* Summary Counter Pill */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="p-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/60">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                TOTAL SESI
                            </span>
                            <span className="font-display-count text-xl text-primary font-bold block mt-0.5">
                                {sessions?.total || sessionList.length}
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/60">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                BUTIR OBAT
                            </span>
                            <span className="font-display-count text-xl text-secondary font-bold block mt-0.5">
                                {totalPillsInView}
                            </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/60">
                            <span className="text-[9px] font-label-code text-on-surface-variant block uppercase">
                                AKURASI
                            </span>
                            <span className="font-display-count text-xl text-tertiary font-bold block mt-0.5">
                                98.8%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Strip */}
                <div className="space-y-1.5">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari obat, no. resep, atau TTK..."
                            className="w-full pl-8 pr-16 py-2 rounded-xl bg-surface-container-high border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none transition-colors shadow-sm"
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-on-surface-variant pointer-events-none" />
                        <button
                            type="submit"
                            className="absolute right-1 top-1 px-2.5 py-1 rounded-lg bg-surface-container-highest text-primary text-[11px] font-semibold hover:text-on-primary hover:bg-primary transition-colors"
                        >
                            Cari
                        </button>
                    </form>

                    {/* Shape Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                        {['all', 'tablet', 'capsule', 'racikan'].map((shape) => (
                            <button
                                key={shape}
                                type="button"
                                onClick={() => handleShapeFilter(shape)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                    selectedShape === shape
                                        ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                        : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                {shape === 'all'
                                    ? 'Semua'
                                    : shape === 'tablet'
                                    ? 'Tablet'
                                    : shape === 'capsule'
                                    ? 'Kapsul'
                                    : 'Racikan'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sessions List */}
                <div className="space-y-2">
                    {sessionList.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-surface-container-high border border-surface-container-highest text-center space-y-2.5">
                            <Inbox className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
                            <h3 className="font-headline-sm text-sm text-on-surface">
                                Belum Ada Riwayat Sesi
                            </h3>
                            <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
                                Mulai hitung obat menggunakan kamera untuk melihat arsip di sini.
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-md"
                            >
                                <Scan className="w-4 h-4" />
                                <span>Mulai Hitung</span>
                            </Link>
                        </div>
                    ) : (
                        sessionList.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleOpenDetail(item)}
                                className="p-3 rounded-xl bg-surface-container-high border border-surface-container-highest/70 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-lg flex items-center justify-between gap-2.5 group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-11 h-11 rounded-lg bg-surface-container-lowest border border-surface-container-highest overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {item.annotated_image_path || item.image_path ? (
                                            <img
                                                src={item.annotated_image_path || item.image_path}
                                                alt={item.medicine_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                        ) : (
                                            <Pill className="w-5 h-5 text-primary" />
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                                                {item.medicine_name}
                                            </h3>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-label-code bg-surface-container-lowest text-primary font-bold border border-primary/20 flex-shrink-0">
                                                {item.prescription_no}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                                            <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                                                <User className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{item.pharmacist_name || 'Petugas'}</span>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {new Date(item.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Count Badge */}
                                <div className="text-right flex-shrink-0 flex flex-col items-end">
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="font-display-count text-xl font-bold text-secondary">
                                            {item.manual_count}
                                        </span>
                                        <span className="text-[10px] text-on-surface-variant">
                                            Btr
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-label-code text-on-surface-variant uppercase">
                                        {item.shape_filter}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {sessions?.links && sessions.links.length > 3 && (
                    <div className="flex items-center justify-center gap-1 pt-2 pb-2">
                        {sessions.links.map((link, idx) => (
                            <Link
                                key={idx}
                                href={link.url || '#'}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    link.active
                                        ? 'bg-primary text-on-primary font-bold'
                                        : link.url
                                        ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                                        : 'text-on-surface-variant/40 pointer-events-none'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </main>

            <DetailModal
                session={selectedSession}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                onDelete={handleDelete}
            />
        </div>
    );
}
