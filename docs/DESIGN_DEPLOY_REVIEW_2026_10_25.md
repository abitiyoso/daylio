# Review desain dan kesiapan deploy — 25 Oktober 2026

Permintaan: tinjau aplikasi sebagai pengalaman yang dipakai orang sehari-hari, perbaiki bagian yang tidak rapi, dan nilai kesiapan deploy. Pemeriksaan ini memakai screenshot baru dari preview berjalan dan database pengujian terpisah. Desain, logo asli, autentikasi, API, data tersimpan, dan izin tiap role dipertahankan.

## Temuan visual dan perbaikan

| Prioritas | Langkah / bukti aktual | Masalah | Perbaikan |
|---|---|---|---|
| P1 | 1 — `01-owner-visible-before.png` | Banyak teks statistik/catatan hanya 10–12px dengan warna pucat. Kesan rapi dari jauh tidak berarti nyaman dibaca saat bekerja. | Label penting 13–14px, teks pendukung lebih gelap; ukuran dan kontras label Owner diuji dari computed style. Brand coral dan logo tetap. |
| P1 | 4 — `before/parent-1440.png` | Kartu menumpuk hanya di kanan setelah Daily Story; ruang kiri kosong panjang. Tombol pesan pagi membungkus menjadi dua baris pada kartu sempit. | Lima kartu masuk grid yang sama; pesan pagi dan penjemputan menempati kedua kolom. Header kartu bisa membungkus tanpa memecah label tombol. Mobile tetap satu kolom. |
| P1 | 3 — `before/caregiver-390.png` (bagian statistik) | Empat statistik dipadatkan dalam satu baris, dengan label sekitar 9px. | Pada ponsel, statistik menjadi 2×2 dengan label 13px dan ruang baca yang cukup. Tidak ada angka contoh tambahan. |
| P1 | 5 — `02-planner-visible.png` | Kalender desktop umum tidak menampilkan seluruh minggu karena panel detail mengambil lebar; hari Minggu tersembunyi di balik scroll. | Pada lebar 1181–1500px, detail pindah ke bawah sehingga seluruh minggu muat. Pada tablet yang lebih sempit, scroll internal kalender tetap tersedia. Bukti: `04-planner-visible-after.png`. |
| P2 | 4 — keadaan kosong Parent | Teks mengatakan cerita sedang disiapkan meski belum ada catatan proses. Ikon centang dipakai saat kedatangan belum tercatat. | Teks menyatakan belum ada cerita hari ini, dengan tombol membuka cerita sebelumnya. Kedatangan tanpa catatan memakai ikon kalender. Tidak mengklaim pekerjaan staf yang belum tercatat. |
| P2 | 1 / QA — `rejected-loading-owner.png` | Capture sebelumnya bisa lolos saat OwnerSummary masih mengambil data, karena induknya sudah tidak busy. | OwnerSummary mengekspos status busy sendiri dan tetap menampilkan judul halaman saat loading/error. Capture menunggu ringkasan selesai. Gambar loading tidak dipakai sebagai bukti desain final. |
| P2 | 6 — formulir 320px | Ukuran teks formulir berbeda-beda dan berisiko sulit dibaca di ponsel. | Field workspace minimum 16px pada ponsel; posisi dialog pagi, seluruh field, dan penutup dialog diuji pada 320px. |

## Alur yang ditinjau

1. **Owner — statistik, kapasitas, tindakan dan funnel.** Tipografi diperjelas; funnel mobile menjadi tiga kolom per baris. [Desktop akhir](../evidence/design-polish-20261025/after/owner-1440.png), [mobile akhir](../evidence/design-polish-20261025/after/owner-390.png). Judul tetap tersedia saat memuat dan ketika terjadi error.
2. **Manager — Control Tower dan antrean review.** Struktur exception-first dipertahankan; teks pendukung diperjelas. [Desktop](../evidence/design-polish-20261025/after/manager-1440.png), [mobile](../evidence/design-polish-20261025/after/manager-390.png). Review dan izin diuji lewat suite role/care terpisah.
3. **Pengasuh — Today, angka kelas dan pintasan aktivitas.** Statistik mobile 2×2, label aktivitas diperbesar, catatan Care Passport lebih terbaca. [Desktop](../evidence/design-polish-20261025/after/caregiver-1440.png), [mobile](../evidence/design-polish-20261025/after/caregiver-390.png).
4. **Orang Tua — Today dan Daily Story.** Kartu tidak lagi terkumpul di kolom kanan. Cerita hari ini dan cerita sebelumnya dibedakan. [Sebelum](../evidence/design-polish-20261025/before/parent-1440.png), [desktop akhir](../evidence/design-polish-20261025/after/parent-1440.png), [mobile akhir](../evidence/design-polish-20261025/after/parent-390.png), [Story mobile](../evidence/design-polish-20261025/after/parent-story-390.png).
5. **Jadwal — kalender dan detail kapasitas.** Seluruh tujuh hari terlihat pada desktop umum. [Sebelum](../evidence/design-polish-20261025/02-planner-visible.png), [sesudah](../evidence/design-polish-20261025/04-planner-visible-after.png). Pengaturan booking/shift dan validasi kapasitas tetap menggunakan layanan yang sama.
6. **Responsive dan formulir.** Empat role diperiksa pada 1440/1024/768/390/320px. Tes mencakup satu judul utama, lebar halaman, teks pendukung, posisi kartu Parent, statistik Pengasuh, kalender desktop dan dialog pesan pagi. [Bukti tes](../evidence/design-polish-20261025/validation/results.json).

Seluruh bukti yang diterima diambil pada review ini dan diperiksa secara visual. Screenshot full-page mobile memperlihatkan navigasi bawah yang fixed pada batas viewport awal; scroll sehari-hari tidak menggandakan navigasi. Screenshot Owner yang masih loading ditolak. Bagian bawah capture Pengasuh awal tidak digunakan sebagai bukti penerimaan; capture akhir menampilkan kartu dan footer lengkap.

## Penilaian kesiapan

**Desain diperbaiki untuk staging/UAT pada layar dan alur yang diuji. Ini belum persetujuan produksi untuk data anak sungguhan.** Tidak ada deploy, perubahan akun produksi, pengiriman pesan eksternal atau transaksi pembayaran pada review ini.

Penerimaan desain lokal: konten terbaca, hierarki judul konsisten, tidak ada overflow halaman pada ukuran uji, kartu keluarga seimbang, statistik tidak dipaksa terlalu rapat, dan formulir mobile tetap bisa dibaca. Pemeriksaan kontras terprogram mencakup label statistik/kapasitas Owner, bukan sertifikasi WCAG menyeluruh. Pengujian pembaca layar penuh, perangkat fisik, nama/catatan sangat panjang dan penerimaan staf/orang tua nyata masih perlu dilakukan dalam UAT.

Gerbang produksi yang tetap terbuka: konfigurasi hosted database/auth dan pembatasan sandbox, bukti email undangan/verifikasi masuk inbox nyata, uji backup–restore/operasional, serta kontrak/pengujian provider WhatsApp dan pembayaran jika dipakai. LEO tetap memakai mode catatan terverifikasi kecuali provider nyata sudah dikonfigurasi. CCTV dan Video Analytics live tetap ditunda; gateway, streaming dan analytics engine Elenio tidak dibangun ulang.

Hasil build, regresi dan status final dicatat di `IMPLEMENTATION_STATUS.md` serta folder `evidence/design-polish-20261025/`. Angka yang lulus tidak menutup sisa definisi selesai F01–F42 atau menggantikan UAT produksi.

## Bukti validasi

- `unit-tests.txt`: 55/55 tes backend lulus.
- `browser-regressions.txt`, `all-suite-results.json`: 10/10 suite berbeda lulus bersama, termasuk 40 kasus role/halaman/viewport serta 20 kasus desain.
- `final-design-regressions.txt`, `validation/results.json`: pengulangan akhir menambah pemeriksaan kontras label Owner, kalender seminggu penuh pada 1440px dan capture viewport dialog 320px. Teks statistik/kapasitas yang diuji minimal 13px dan kontras terhadap putih minimal 4,5:1.
- `build.txt`, `typecheck.txt`, `final-lint.txt`, `format.txt`: build webpack produksi, TypeScript, pemeriksaan sintaks/kredensial dan formatting lulus.
- `after/results.json`: capture empat role desktop/mobile tanpa mutasi bisnis; fingerprint tetap `12a9552d42254df0c6e6fd76a6c357f2`.

Satu pengulangan capture dijalankan ketika preview sedang restart setelah build. Seluruh assertion desain lulus, tetapi guard fingerprint menolak run karena baseline preview tidak tersedia saat mulai; log disimpan sebagai `rejected-preview-restart-timing.txt` dan tidak dipakai sebagai penerimaan akhir. Pemeriksaan diulang dengan preview stabil. Screenshot dialog menggunakan viewport, sehingga backdrop fixed sesuai yang dilihat pengguna; capture full-page sebelumnya tidak dipakai untuk menilai posisi dialog.
