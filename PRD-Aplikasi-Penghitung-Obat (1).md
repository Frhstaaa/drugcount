# PRD: PillCount — Aplikasi Web Penghitung Jumlah Obat via Kamera

**Versi Dokumen:** 1.0
**Tanggal:** 22 September 2026
**Status:** Draft untuk Diskusi
**Pemilik Produk:** _(diisi)_

---

## 1. Ringkasan Eksekutif

PillCount adalah aplikasi web *mobile-first* yang memanfaatkan kamera perangkat untuk mendeteksi dan menghitung jumlah obat secara otomatis dan real-time — mencakup baik **tablet baku berbentuk seragam** (bulat, oval, kaplet, bersalut) maupun **kapsul**, serta **butir obat racikan/lepas** yang bentuknya tidak seragam (mis. untuk penyiapan puyer). Tujuannya adalah mempercepat dan mengurangi kesalahan proses penghitungan manual obat di apotek, klinik, maupun instalasi farmasi rumah sakit, terutama untuk peracikan resep dalam jumlah besar.

Pengguna cukup menyebar obat di atas permukaan datar (nampan/puyer tray), mengarahkan kamera ponsel/tablet, dan aplikasi akan menampilkan jumlah obat yang terdeteksi secara langsung di layar, lengkap dengan opsi koreksi manual sebelum jumlah dikonfirmasi.

---

## 2. Latar Belakang & Masalah

Di apotek dengan volume resep tinggi, penghitungan obat manual (dihitung satu per satu dengan tangan atau alat hitung tablet konvensional) memakan waktu dan rawan human error, terutama saat:
- Jumlah obat besar (>30 butir) dalam satu resep.
- Petugas kelelahan atau bekerja di jam sibuk.
- Obat berukuran kecil/mirip warna dengan alas kerja.

Kesalahan hitung berisiko langsung terhadap keselamatan pasien (kekurangan/kelebihan dosis pada obat yang diserahkan) dan terhadap efisiensi operasional apotek. Alat pill-counter fisik yang ada di pasaran umumnya mahal dan tidak portabel. Solusi berbasis kamera web membuka opsi yang murah, cepat diakses, dan tidak butuh instalasi.

---

## 3. Tujuan Produk

| Tujuan | Indikator |
|---|---|
| Mempercepat proses hitung obat | Waktu hitung turun signifikan dibanding manual untuk jumlah >20 butir |
| Menurunkan kesalahan hitung | Akurasi deteksi otomatis mendekati hitungan manual yang teliti |
| Mudah diakses tanpa instalasi | Bisa langsung dipakai dari browser mobile, tanpa app store |
| Mendukung alur kerja farmasi | Ada pencatatan/riwayat hasil hitung yang bisa dirujuk kembali |

---

## 4. Target Pengguna

- **Primer:** Tenaga Teknis Kefarmasian (TTK) dan Apoteker di apotek retail/klinik yang meracik obat non-kemasan (obat lepas/puyer).
- **Sekunder:** Petugas instalasi farmasi rumah sakit, staf gudang farmasi untuk pengecekan stok cepat.

**Konteks penggunaan:** Berdiri di meja racik, satu tangan memegang ponsel/tablet, kondisi pencahayaan indoor apotek (bervariasi, tidak selalu ideal).

---

## 5. Ruang Lingkup

### Masuk Lingkup (MVP)
- Deteksi & hitung otomatis objek obat melalui kamera secara real-time, mencakup: tablet standar (bulat/oval/kaplet/bersalut), kapsul, dan butir obat racikan/lepas berbentuk tidak seragam.
- Overlay visual (bounding box + angka jumlah) di atas video kamera.
- Fitur "bekukan hasil" (freeze/capture) untuk mengunci angka.
- Koreksi manual (tambah/kurang) sebelum konfirmasi akhir.
- Simpan riwayat sesi hitung (nama obat, jumlah, waktu, nama petugas).
- Tampilan mobile-first, responsif untuk ponsel & tablet.

### Belum Masuk Lingkup (Out of Scope v1)
- Identifikasi jenis/nama obat otomatis (image recognition per jenis obat spesifik).
- Integrasi langsung ke sistem POS/SIM Apotek (direncanakan v2).
- Mode offline penuh (PWA offline) — dipertimbangkan di v2.
- Multi-jenis obat dalam satu bidang pandang kamera sekaligus (v1 asumsikan satu jenis obat per sesi hitung).

---

## 6. Alur Pengguna (User Flow)

1. Pengguna membuka aplikasi via browser mobile → diminta izin akses kamera.
2. Pengguna menyebar obat merata di atas nampan/alas kontras (disarankan alas polos).
3. Pengguna mengarahkan kamera ke obat → sistem mendeteksi objek dan menampilkan jumlah live di layar.
4. Pengguna menekan tombol **"Kunci Hasil"** saat hitungan dirasa stabil/akurat.
5. Layar menampilkan hasil akhir + tampilan hasil deteksi (objek yang terhitung ditandai).
6. Pengguna dapat **tambah/kurang manual** jika ada obat yang tidak terdeteksi/terdeteksi ganda.
7. Pengguna mengisi label opsional (nama obat, no. resep) dan menekan **"Simpan"**.
8. Hasil tersimpan di riwayat, dapat dilihat/diekspor kembali.

---

## 7. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F1 | Sistem dapat mengakses kamera perangkat (belakang, default) via browser | Must |
| F2 | Sistem mendeteksi objek obat dengan variasi bentuk: tablet standar (bulat, oval, kaplet, bersalut), kapsul, dan butir obat racikan/lepas yang bentuknya tidak seragam | Must |
| F2a | Sistem tetap akurat menghitung meski dalam satu bidang kamera hanya berisi satu kategori bentuk (tablet seragam **atau** butir racikan tidak seragam) — bukan campuran keduanya di v1 | Must |
| F3 | Sistem menampilkan jumlah objek terdeteksi secara real-time (update tiap beberapa frame) | Must |
| F4 | Sistem menandai visual tiap objek terdeteksi (bounding box/marker) agar user bisa verifikasi | Must |
| F5 | Pengguna dapat membekukan (freeze) frame untuk mengunci hasil hitung | Must |
| F6 | Pengguna dapat mengoreksi jumlah secara manual (+/-) setelah freeze | Must |
| F7 | Pengguna dapat menyimpan hasil hitung dengan label (nama obat, catatan) | Must |
| F8 | Pengguna dapat melihat riwayat hitung sebelumnya | Should |
| F9 | Pengguna dapat mengekspor/membagikan hasil (screenshot/PDF sederhana) | Should |
| F10 | Sistem memberi indikator kualitas pencahayaan/fokus kurang baik | Should |
| F11 | Multi-akun/login petugas untuk pencatatan siapa yang menghitung | Could |
| F12 | Kalibrasi ukuran objek (untuk obat dengan ukuran sangat kecil/besar) | Could |

---

## 8. Kebutuhan Non-Fungsional

- **Akurasi:** Target deteksi otomatis mendekati akurat pada kondisi pencahayaan baik dan obat tidak saling tumpuk; sistem **wajib** menyediakan jalur koreksi manual karena hasil akhir tetap harus diverifikasi oleh tenaga farmasi sebelum obat diserahkan ke pasien (bukan pengganti tanggung jawab profesional).
- **Kecepatan:** Deteksi dan pembaruan angka tampil dalam hitungan sub-detik agar terasa real-time.
- **Kompatibilitas:** Berjalan di browser mobile utama (Chrome Android, Safari iOS) tanpa instalasi tambahan.
- **Desain:** Mobile-first, dioperasikan dengan satu tangan, tombol utama mudah dijangkau ibu jari.
- **Privasi & Keamanan Data:** Data yang tersimpan (riwayat, nama petugas) mengikuti prinsip perlindungan data pribadi (UU PDP); gambar/video kamera idealnya diproses di perangkat (on-device) dan tidak dikirim/disimpan di server tanpa keperluan jelas.
- **Ketersediaan:** Aplikasi tetap dapat dibuka meski koneksi lambat (loading ringan); pemrosesan deteksi tidak bergantung penuh pada server jika memungkinkan.

---

## 9. Desain UI/UX (Mobile First)

Prinsip desain:
- **Layar utama = kamera penuh.** Viewfinder kamera mendominasi layar sejak dibuka, mengurangi friksi.
- **Angka hasil hitung besar & jelas**, ditampilkan mengambang di bagian atas/bawah layar agar mudah dibaca sambil memegang alat racik di tangan lain.
- **Tombol aksi utama** ("Kunci Hasil", "+", "−", "Simpan") berukuran besar dan berada di zona jangkauan ibu jari (bottom third layar).
- **Feedback visual instan**: obat yang terdeteksi ditandai (mis. lingkaran/kotak tipis) agar pengguna percaya pada sistem dan mudah melihat objek yang terlewat.
- **Mode gelap/terang otomatis** menyesuaikan pencahayaan apotek.
- **Navigasi minim**: 3 tampilan inti saja — Kamera (utama), Hasil/Konfirmasi, Riwayat.

---

## 10. Arsitektur Teknis (Usulan Awal)

- **Frontend:** Web app responsif (mobile-first), akses kamera via `getUserMedia` (WebRTC).
- **Deteksi Objek:** Model computer vision ringan yang berjalan di sisi klien (on-device inference di browser) untuk mendeteksi objek kontras terhadap latar belakang — dipilih agar cepat, bekerja tanpa koneksi stabil, dan tidak mengirim gambar obat ke server (privasi). Model perlu dilatih/diuji pada dua profil bentuk yang berbeda karakteristiknya: (1) tablet/kapsul standar berbentuk seragam dan relatif mudah dipisahkan, dan (2) butir obat racikan/lepas yang ukuran & bentuknya tidak seragam sehingga lebih rawan salah hitung saat saling bersentuhan.
- **Penyimpanan Riwayat:** Basis data ringan untuk menyimpan metadata hasil hitung (jumlah, waktu, label) — gambar mentah tidak perlu disimpan permanen kecuali dibutuhkan untuk audit.
- **Progressive Web App (PWA)** dipertimbangkan agar bisa "diinstal" ke home screen tanpa app store, mendekati pengalaman aplikasi native.

_Catatan: pemilihan model/pustaka deteksi spesifik memerlukan riset & uji akurasi terpisah sebelum implementasi._

---

## 11. Metrik Keberhasilan (Success Metrics)

| Metrik | Target Awal |
|---|---|
| Rata-rata waktu hitung per resep (obat >20 butir) | Turun dibanding metode manual |
| Tingkat penggunaan fitur koreksi manual | Dipantau sebagai proxy akurasi model |
| Retensi penggunaan mingguan oleh apotek pilot | Meningkat stabil selama masa pilot |
| Kepuasan pengguna (survei TTK/Apoteker) | Skor kepuasan positif pada uji pilot |

---

## 12. Risiko, Batasan & Asumsi

- **Risiko akurasi:** Obat yang saling menumpuk, warna mirip alas, atau pencahayaan buruk dapat menurunkan akurasi deteksi → mitigasi: wajib ada langkah koreksi manual sebelum data final disimpan/digunakan.
- **Risiko keselamatan pasien:** Aplikasi berposisi sebagai **alat bantu**, bukan pengganti verifikasi profesional; perlu pernyataan/disclaimer jelas di aplikasi.
- **Variasi bentuk obat:** Kapsul, tablet salut, obat non-bulat mungkin butuh penyesuaian model lanjutan.
- **Asumsi:** Pengguna menyebar obat pada alas kontras dan tidak bertumpuk untuk hasil optimal pada versi MVP.
- **Ketergantungan perangkat:** Kualitas kamera & pencahayaan ruang kerja memengaruhi hasil.

---

## 13. Roadmap Rilis

| Fase | Cakupan |
|---|---|
| **MVP (v1)** | Deteksi & hitung real-time, koreksi manual, simpan riwayat dasar |
| **v1.1** | Ekspor hasil (PDF/gambar), indikator kualitas pencahayaan, PWA installable |
| **v2** | Multi-jenis obat sekaligus, integrasi sistem apotek (SIM/POS), akun multi-petugas & laporan |

---

## 14. Pertanyaan Terbuka

1. Apakah gambar/video perlu disimpan untuk keperluan audit kepatuhan farmasi, atau cukup metadata jumlah saja?
2. Apakah dibutuhkan integrasi dengan sistem apotek yang sudah ada sejak MVP, atau bisa berdiri sendiri dulu?
3. Target device: khusus smartphone, atau juga tablet yang sering dipakai di meja racik?
4. Apakah perlu mode multi-bahasa (untuk jaringan apotek nasional)?

---

*Dokumen ini adalah draft awal dan terbuka untuk direvisi bersama tim produk, engineering, serta perwakilan apoteker sebagai pengguna akhir.*
