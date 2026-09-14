# UAT & Rencana Pengujian — Spartacus 1.0.4

**Tujuan:** memastikan aplikasi membantu pengguna fokus dengan tenang: alur utama cepat dipahami, tidak ada pekerjaan/target yang hilang, dan audio/notifikasi tidak mengganggu.

## Ruang lingkup dan peserta

- **Build:** 1.0.4 (Windows, Electron 43).
- **Peserta yang disarankan:** 5–7 orang: pekerja fokus, mahasiswa, dan pengguna yang biasa memakai Pomodoro; minimal 1 pengguna keyboard-only.
- **Perangkat:** laptop Windows, headphone, koneksi online dan kondisi offline.
- **Data awal:** setel fokus/break menjadi 1 menit untuk UAT, aktifkan alarm dan notifikasi, siapkan satu video YouTube biasa berdurasi pendek.
- **Kriteria lulus UX:** minimal 80% peserta menyelesaikan skenario utama tanpa bantuan; tidak ada kegagalan P0/P1; skor kemudahan memakai (1–5) rata-rata minimal 4.

## Skenario UAT prioritas

| ID | Prioritas | Skenario & langkah ringkas | Hasil yang diharapkan / bukti lulus |
|---|---|---|---|
| UAT-01 | P0 | **Mulai fokus:** buka aplikasi, pahami layar, klik `START`, lalu `PAUSE` dan lanjutkan. | Waktu berkurang akurat, tombol dan judul menunjukkan status yang jelas, resume tidak mereset waktu. Pengguna tahu cara mulai dalam ≤10 detik. |
| UAT-02 | P0 | **Selesaikan siklus:** set fokus 1 menit, jalankan sampai selesai; ulangi sampai jumlah ronde tercapai. | Alarm lembut, notifikasi, dan taskbar flash muncul bila diaktifkan; aplikasi berpindah ke short/long break yang tepat; titik sesi dan pesan sesuai. |
| UAT-03 | P0 | **Kontrol aman saat timer aktif:** ketika fokus berjalan, pindah ke tab Break/Long; coba pause, reset, skip, dan start dari tab itu. | Tidak ada waktu yang tertukar atau sesi hilang. Aplikasi harus menjelaskan timer mana yang aktif dan meminta konfirmasi untuk aksi destruktif/berpindah sesi. |
| UAT-04 | P1 | **Tetap fokus di aplikasi lain:** jalankan timer, masuk mini mode, pindah ke aplikasi lain, lalu kembali dengan klik dan `Esc`. | Widget selalu di atas, waktu/progress terbaca, timer tetap berjalan, dan ukuran/jendela sebelumnya dipulihkan tanpa mengejutkan pengguna. |
| UAT-05 | P1 | **Konfigurasi personal:** ubah durasi, ronde, alarm, dan notifikasi; pilih Cancel lalu Save; restart aplikasi. | Cancel tidak mengubah konfigurasi; Save memvalidasi rentang dan tersimpan setelah restart. Perubahan yang akan mereset timer aktif dijelaskan sebelum disimpan. |
| UAT-06 | P0 | **Target:** tambah Vision/3 Years/Year/Quarter/Month, tautkan tiap level ke induknya, tandai selesai, hapus, lalu restart. Buka History dan pilih periode lama. | Target, relasi induk, dan statusnya tersimpan; penghitung benar; urutan horizon mudah dipahami; relasi tampil pada item; periode lampau dapat dibaca. Penghapusan tidak terjadi tanpa sengaja (ada Undo/konfirmasi). |
| UAT-07 | P1 | **Ambience:** nyalakan dua ambience, ubah volume masing-masing dan master, matikan kembali. | Suara dapat dilapis, transisinya halus, volume tersimpan, dan tidak ada audio yang tersisa setelah dimatikan. |
| UAT-08 | P1 | **Lofi offline:** matikan internet, pilih beberapa built-in track, gunakan play/pause/prev/next dan volume. | Track bermain tanpa internet, judul aktif jelas, background berganti halus, kontrol berlaku pada track aktif. |
| UAT-09 | P1 | **YouTube audio:** masukkan URL valid, URL invalid, live stream, duplikat, lalu hapus track. | Input invalid/unsupported memberi pesan ramah; selama memuat ada status/progress; track valid masuk antrean dan dapat diputar audio-only; hapus tidak salah track. |
| UAT-10 | P1 | **Gangguan koneksi/cache:** putuskan internet saat mengambil metadata/download dan ketika cache hampir penuh. | Aplikasi tidak hang; error menjelaskan tindakan berikutnya; track cache tetap dapat diputar dan pembersihan cache tidak menghapus item yang sedang digunakan. |
| UAT-11 | P1 | **Quote & kondisi offline:** refresh quote saat online lalu offline. | Quote muncul saat online; saat offline pengguna tetap melihat quote terakhir/fallback dan pesan tidak menghalangi fokus. |
| UAT-12 | P2 | **Update:** pada aplikasi terpasang, cek update; uji status none/error/ready dan restart-install. | Status mudah dimengerti; download di background tidak mengganggu sesi; restart hanya setelah persetujuan pengguna. |
| UAT-13 | P0 | **Aksesibilitas keyboard:** tanpa mouse navigasikan Timer, Goals, Settings, ambience, musik, modal, dan mini mode dengan Tab/Shift+Tab/Enter/Space/Esc. | Semua aksi memiliki fokus terlihat, urutan fokus logis, kontrol non-teks memiliki nama yang dapat dibaca screen reader, shortcut tidak aktif saat mengetik. |
| UAT-14 | P1 | **Keandalan data:** tambahkan goals/queue/settings, tutup paksa atau restart saat timer berjalan, buka lagi. | Data yang telah disimpan pulih. Untuk sesi aktif, aplikasi memulihkan sisa waktu atau menjelaskan bahwa sesi dijeda—bukan diam-diam meresetnya. |

Untuk setiap skenario, catat: peserta, perangkat/headphone, durasi, berhasil/gagal, jumlah bantuan, skor kenyamanan 1–5, kutipan peserta, serta screenshot/video bila gagal.

## Hasil pengujian teknis saat ini

Dilakukan pada 23 Agustus 2026 di workspace sumber.

| Pemeriksaan | Hasil | Bukti / batasan |
|---|---|---|
| Sintaks main, preload, renderer | Lulus | `node --check main.js`, `preload.js`, dan `renderer/app.js` selesai tanpa error. |
| Alarm | Lulus parsial | `npx electron tools/test-alarm.js` berhasil merender `alarm-test.wav` (8 detik). Perlu UAT pendengaran dan verifikasi volume pada speaker/headphone nyata. |
| Smoke UI Electron | Lulus | `SMOKE_TEST=1 npx electron . --user-data-dir=<profil-sementara>`: halaman termuat, alarm/notifikasi/flash dipicu, mini mode masuk/keluar, lofi dan background berfungsi, memory per-tab menghasilkan `OK`, mode lain terkunci saat Focus aktif (`mode lock: OK`), relasi 3-year tersimpan/terlihat, History menampilkan periode lampau, Undo goal bekerja, dan sesi timer aktif dapat dipulihkan. |
| Paket installer Windows | Lulus | `npm run dist` menghasilkan NSIS installer dan blockmap tanpa error. Instal/update pada komputer bersih belum diuji. |
| Penyelesaian timer, notifikasi Windows, YouTube nyata, update rilis, pemulihan data, dan aksesibilitas | Belum diuji | Harus dijalankan melalui UAT-02, 09, 12–14; jangan ditandai lulus hanya dari smoke test. |

## Temuan UX yang perlu ditangani sebelum/selama UAT

1. **P0 — kontrol timer lintas tab (sudah diperbaiki).** Saat sesi berjalan, tab mode lain sekarang terkunci secara visual; klik memberi pesan bahwa pengguna harus pause atau skip sesi aktif terlebih dahulu. Dengan demikian `Pause`, `Reset`, dan `Skip` selalu berlaku pada timer yang terlihat. Smoke regression mencakup perilaku ini; tetap validasikan kejelasan pesannya melalui UAT-03.
2. **P1 — perubahan Settings me-reset sesi aktif tanpa peringatan.** `Save` menghentikan timer dan mengembalikan semua mode ke Focus. Tampilkan dampak dan pilihan “simpan setelah sesi” / “reset sekarang”.
3. **P1 — mini mode tidak memulihkan ukuran jendela sebelumnya.** Keluar dari mini memaksa ukuran 1200×800. Simpan bounds dan status maximize sebelum masuk mini, lalu pulihkan.
4. **P1 — riwayat goals (sudah diperbaiki).** Bagian `View Past Goals` sekarang memperlihatkan periode bulan, kuartal, atau tahun sebelumnya dalam mode baca. Validasi UAT-06 tetap diperlukan untuk memastikan periode yang berganti tahun tampil benar.
5. **P1 — penghapusan goal (sudah diperbaiki).** Menghapus goal kini menampilkan `Undo` selama 6 detik. Penghapusan antrean YouTube masih belum memiliki Undo agar cache audio tidak dipulihkan secara mengejutkan.
6. **P1 — aksesibilitas belum cukup.** Kartu ambience berupa `div` yang tidak dapat dioperasikan keyboard; banyak kontrol belum memiliki focus style/label aksesibel. Gunakan elemen `button`, `aria-label`, fokus terlihat, dan modal focus trap.
7. **P2 — pemulihan sesi timer (sudah diperbaiki).** Sesi aktif menyimpan mode, sisa waktu, dan waktu selesai. Saat dibuka kembali, timer dilanjutkan dengan sisa waktu yang akurat; sesi yang berakhir ketika aplikasi tertutup dipindahkan secara tenang ke sesi berikutnya tanpa alarm yang terlambat.

## Backlog fitur yang direkomendasikan (berdasarkan nilai kenyamanan)

| Urutan | Fitur | Nilai bagi pengguna |
|---|---|---|
| 1 | **Task sesi tunggal + catatan singkat** | Pengguna selalu tahu apa yang sedang dikerjakan; riwayat fokus menjadi bermakna tanpa mengubah aplikasi menjadi task manager berat. |
| 2 | **Pemulihan sesi + reminder lembut** | Mencegah waktu fokus hilang akibat restart/close dan mengurangi kecemasan pengguna. |
| 3 | **History & review mingguan** | Menampilkan goals lampau, jumlah sesi, jam fokus, dan streak secara sederhana; menghubungkan timer dengan tujuan. |
| 4 | **Preset fokus** | Preset “Deep work 50/10”, “Study 25/5”, dan custom mengurangi konfigurasi berulang. |
| 5 | **Quick start / mode minimal** | Tombol satu klik untuk memulai preset terakhir, pilih ambience terakhir, dan task opsional—ideal untuk memulai tanpa friction. |
| 6 | **Pengelolaan audio yang nyaman** | Favorit/mix ambience, fade in/out, pilihan “stop audio saat break”, impor musik lokal, dan reorder antrean. |
| 7 | **Alarm yang dapat dikendalikan** | Tombol Dismiss/Snooze serta pilihan level suara/suara alarm agar tidak mengejutkan pengguna. |
| 8 | **Aksesibilitas & bahasa** | Bahasa Indonesia/English, skala teks, mode kontras, screen reader, serta navigasi keyboard penuh. |
| 9 | **Backup/ekspor privasi-lokal** | Ekspor/impor goals, settings, dan statistik sebagai JSON/CSV tanpa akun atau cloud wajib. |

**Prinsip prioritas:** selesaikan P0 dan pemulihan/data terlebih dahulu; fitur statistik atau integrasi eksternal hanya ditambah bila tetap menjaga layar tenang dan waktu mulai fokus tetap sangat singkat.
