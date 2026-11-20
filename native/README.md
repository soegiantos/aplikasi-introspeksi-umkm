# Aplikasi Native & Desktop — UMKM Tumbuh (Gelombang 7)

Folder ini berisi **persiapan** aplikasi Android resmi, iOS resmi, dan
desktop PC untuk UMKM Tumbuh. Sesuai keputusan peta jalan (Bab 14):
**versi web tetap menjadi jalur pembaruan utama** — pembungkus di sini
memuat aplikasi web live (`https://aplikasi-introspeksi-umkm.vercel.app`),
bukan salinan kode. Sekali web diperbarui, aplikasi native dan desktop
ikut diperbarui tanpa rilis baru.

## Status (20 November 2026)

| Platform | Yang sudah disiapkan di sini | Yang masih perlu tindakan pemilik |
|---|---|---|
| Android (Play Store) | `capacitor.config.json`, `android/package.json`, ikon 512, `manifest.webmanifest` di root repo, panduan langkah demi langkah | Akun Google Play Developer (US$25 sekali), kunci penandatanganan, kirim ke review Play Store |
| iOS (App Store) | Konfigurasi Capacitor yang sama, panduan langkah demi langkah | Mac + Xcode, akun Apple Developer (US$99/tahun), kirim ke review App Store |
| Desktop (Windows/Mac/Linux) | `desktop/package.json`, `desktop/main.js` (Electron), panduan membangun | Jalankan `npm install` + `npm run dist` di komputer sendiri; uji printer termal di perangkat nyata |

**Tidak ada** pendaftaran akun, pengunggahan ke toko, atau transaksi
apa pun yang dilakukan di gelombang ini — itu langkah pemilik usaha.

## Struktur

```
native/
  README.md                  ← berkas ini
  capacitor.config.json      ← konfigurasi bersama Android + iOS
  icon.png / icon-512.png    ← ikon aplikasi (dari ikon web yang sudah ada;
                               ganti dengan artwork asli 1024x1024 sebelum
                               dikirim ke toko — ikon di sini diperbesar
                               dari 180x180 dan kualitasnya terbatas)
  android/
    package.json             ← dependensi Capacitor Android
    panduan-android.md       ← langkah demi langkah sampai Play Store
  ios/
    panduan-ios.md           ← langkah demi langkah sampai App Store
  desktop/
    package.json             ← dependensi Electron + electron-builder
    main.js                  ← jendela desktop (memuat URL live)
    panduan-desktop.md       ← langkah membangun untuk Windows/Mac/Linux
```

## Catatan penting sebelum penerbitan

1. **Nama & identitas:** nama aplikasi "UMKM Tumbuh", ID aplikasi
   `id.umkmtumbuh.app`. Bila pemilik memakai nama/ID lain, ubah di
   `capacitor.config.json` dan `desktop/package.json` sebelum membangun.
2. **Ikon:** ikon di sini diperbesar dari ikon web 180x180. Play Store
   dan App Store meminta ikon 512x512 yang tajam — minta/gunakan
   artwork asli sebelum mengirim.
3. **Kebijakan toko:** aplikasi ini tidak memungut pembayaran di dalam
   aplikasi (langganan dibayar lewat transfer BSI + verifikasi pemilik
   usaha) dan tidak menjadi gerbang pembayaran — jangan tambahkan
   pembelian dalam aplikasi tanpa meninjau kebijakan toko lebih dulu.
4. **Printer:** cetak termal Bluetooth dan laci kas di aplikasi web
   memakai Web Bluetooth; di Electron jalurnya sama lewat peramban
   Chromium — **belum teruji di perangkat nyata** (warisan Gelombang 2/3).
5. **Pembaruan:** karena pembungkus memuat URL live, perbaikan web
   langsung tampil di aplikasi native/desktop tanpa rilis baru. Rilis
   baru hanya diperlukan bila konfigurasi pembungkusnya sendiri berubah.
