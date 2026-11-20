# Panduan Penerbitan iOS — UMKM Tumbuh (App Store)

> Panduan ini menyiapkan dan mengirim aplikasi iOS resmi UMKM Tumbuh
> ke App Store. **Pembangunan iOS hanya bisa dilakukan di Mac**
> (Xcode tidak tersedia di Windows/Linux) — langkah 1–3 memakai Mac
> pemilik usaha atau Mac Mini yang sudah ada.

## Yang dibutuhkan

- Mac dengan Xcode terbaru (dari Mac App Store, gratis).
- Akun Apple Developer Program — US$99/tahun, didaftar pemilik
  usaha sendiri di <https://developer.apple.com/programs/> (butuh
  Apple ID + verifikasi identitas; bila mendaftar sebagai organisasi,
  siapkan D-U-N-S Number).
- Ikon asli 1024x1024 yang tajam (ikon di `native/icon-512.png`
  saat ini diperbesar dari 180x180 — ganti sebelum mengirim).

## Langkah

### 1. Siapkan proyek (di Mac)

```sh
cd native/android          # folder ini memegang package.json Capacitor
npm install
npx cap add ios            # membuat folder ios/ dari konfigurasi
npx cap sync ios           # menyalin konfigurasi + ikon
```

Konfigurasi yang dipakai: `../capacitor.config.json`
(`appId id.umkmtumbuh.app`, nama "UMKM Tumbuh", memuat URL live
`https://aplikasi-introspeksi-umkm.vercel.app`). Karena aplikasi
dimuat dari URL live, pembaruan web langsung tampil di aplikasi
tanpa rilis baru.

### 2. Ganti ikon dan layar pembuka

```sh
npx @capacitor/assets generate --iconBackgroundColor '#0d1411' --iconForegroundColor '#ffffff'
```

(dengan berkas `assets/icon.png` 1024x1024 dan `assets/splash.png`
2732x2732 di folder `native/android/assets/`). Periksa hasilnya di
Xcode → target **App** → **App Icons**.

### 3. Uji di simulator / iPhone

```sh
npx cap open ios           # buka di Xcode
```

Pilih simulator iPhone, tekan Run. Yang wajib dicoba: masuk akun,
buka Mode Kasir, jual satu barang, dan buka PPOB. Untuk iPhone
nyata, daftarkan perangkat di Xcode (Signing & Capabilities →
pilih Team Apple Developer pemilik usaha).

### 4. Tanda tangan & kirim (App Store Connect)

1. Di Xcode: pilih target **App** → **Signing & Capabilities** →
   pilih Team (akun Apple Developer pemilik usaha), centang
   **Automatically manage signing**.
2. **Product → Archive** → sesudah selesai, **Distribute App →
   App Store Connect → Upload**.
3. Masuk <https://appstoreconnect.apple.com> → **My Apps → + →
   New App** → nama "UMKM Tumbuh", bahasa Indonesia, Bundle ID
   `id.umkmtumbuh.app`, SKU bebas (contoh: `UMKM-TUMBUH-001`).
4. Isi listing: deskripsi, tangkapan layar iPhone 6,7" dan 6,5"
   (minimal 2 tiap ukuran), ikon 1024x1024.
5. Isi **App Privacy** (data yang dikumpulkan: data usaha, lokasi
   GPS hanya bila pengguna menekan "Ambil lokasi saya"; tidak ada
   pelacakan iklan).
6. Pilih build yang diunggah → **Submit for Review**. Review
   pertama biasanya 1–3 hari.

### 5. Sesudah rilis

- Pembaruan web (fitur kasir/PPOB) **tidak perlu rilis baru** —
  aplikasi memuat URL live.
- Rilis baru hanya diperlukan bila `capacitor.config.json`,
  dependensi, atau ikon berubah: naikkan versi, Archive ulang,
  kirim build baru.
- Catatan kebijakan Apple: aplikasi ini tidak memungut pembayaran
  di dalam aplikasi (langganan dibayar lewat transfer BSI +
  verifikasi pemilik usaha) dan tidak menjadi gerbang pembayaran.
  Bila App Store meminta pembelian dalam aplikasi untuk langganan,
  itu keputusan pemilik usaha — jangan tambahkan tanpa persetujuannya.
- Web Bluetooth (cetak termal) **tidak tersedia di iOS** — cetak
  dari iPhone memakai dialog cetak sistem (AirPrint) atau struk
  WhatsApp, sama seperti di web.
