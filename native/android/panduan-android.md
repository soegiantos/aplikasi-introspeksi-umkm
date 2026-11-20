# Panduan Penerbitan Android — UMKM Tumbuh (Play Store)

> Panduan ini menyiapkan dan mengirim aplikasi Android resmi UMKM
> Tumbuh ke Play Store. Langkah 1–4 bisa dilakukan siapa saja;
> langkah 5–7 memakai akun dan kunci milik pemilik usaha — **jangan
> dibagikan ke siapa pun**.

## Yang dibutuhkan

- Komputer dengan Node.js 20+ dan Android Studio (atau Android SDK +
  Java 17).
- Akun Google Play Developer — US$25 sekali seumur hidup, dibayar
  pemilik usaha sendiri di
  <https://play.google.com/console/signup>.
- Ikon asli 512x512 yang tajam (ikon di `native/icon-512.png` saat ini
  diperbesar dari 180x180 — ganti sebelum mengirim).

## Langkah

### 1. Siapkan proyek

```sh
cd native/android
npm install
npx cap add android        # membuat folder android/ dari konfigurasi
npx cap sync android       # menyalin konfigurasi + ikon
```

Konfigurasi yang dipakai: `../capacitor.config.json`
(`appId id.umkmtumbuh.app`, nama "UMKM Tumbuh", memuat URL live
`https://aplikasi-introspeksi-umkm.vercel.app`). Karena aplikasi
dimuat dari URL live, pembaruan web langsung tampil di aplikasi
tanpa rilis baru.

### 2. Ganti ikon (bila artwork asli sudah ada)

Letakkan ikon 512x512 di `android/app/src/main/res/` mengikuti
struktur mipmap yang dibuat Capacitor, atau jalankan:

```sh
npx @capacitor/assets generate --iconBackgroundColor '#0d1411' --iconForegroundColor '#ffffff'
```

(dengan berkas `assets/icon.png` 1024x1024 dan `assets/splash.png`
2732x2732 di folder `native/android/assets/`).

### 3. Uji di perangkat / emulator

```sh
npx cap open android       # buka di Android Studio
```

Jalankan di emulator atau HP Android. Yang wajib dicoba: masuk
akun, buka Mode Kasir, jual satu barang, dan buka PPOB. Cetak
termal Bluetooth belum teruji di perangkat nyata — catat hasilnya
bila dicoba.

### 4. Buat kunci penandatanganan (sekali, simpan baik-baik)

```sh
keytool -genkeypair -v -keystore umkm-tumbuh.keystore \
  -alias umkm-tumbuh -keyalg RSA -keysize 2048 -validity 10000
```

**Kunci ini dan kata sandinya milik pemilik usaha.** Bila hilang,
aplikasi tidak bisa diperbarui lagi di Play Store — simpan salinannya
di tempat aman (bukan di repo).

### 5. Bangun berkas rilis (AAB)

Di Android Studio: **Build → Generate Signed App Bundle / APK →
Android App Bundle → release**, pilih keystore langkah 4. Atau
lewat baris perintah:

```sh
cd android && ./gradlew bundleRelease
```

Hasilnya: `android/app/build/outputs/bundle/release/app-release.aab`.

### 6. Kirim ke Play Store

1. Masuk <https://play.google.com/console> → **Create app** →
   nama "UMKM Tumbuh", bahasa default Indonesia, kategori
   "Business".
2. Isi listing toko: deskripsi singkat + lengkap, tangkapan layar
   HP (minimal 2), ikon 512x512, grafik fitur 1024x500.
3. Isi **Data safety** (aplikasi menyimpan data usaha di cloud;
   lokasi GPS hanya bila pengguna menekan "Ambil lokasi saya";
   tidak ada iklan pihak ketiga).
4. Isi **Content rating** (kuesioner IARC — aplikasi bisnis, semua
   umur).
5. Unggah AAB langkah 5 ke jalur **Production** (atau **Closed
   testing** dulu bila mau uji terbatas).
6. Kirim untuk review. Review pertama biasanya 1–7 hari.

### 7. Sesudah rilis

- Pembaruan web (fitur/fitur kasir/PPOB) **tidak perlu rilis baru**
  — aplikasi memuat URL live.
- Rilis baru hanya diperlukan bila `capacitor.config.json`,
  dependensi, atau ikon berubah: naikkan `version` di
  `package.json`, ulangi langkah 5–6.
- Bila Play Store menolak karena "aplikasi hanya membungkus situs
  web", tambahkan nilai khas aplikasi native (mis. notifikasi
  pengingat lewat Capacitor Push Notifications) sebelum
  mengajukan ulang — jangan mengubah isi web hanya untuk toko.
