# Panduan Membangun Desktop — UMKM Tumbuh (Windows / Mac / Linux)

> Aplikasi desktop UMKM Tumbuh (Electron) memuat aplikasi web live.
> Sekali web diperbarui, aplikasi desktop ikut diperbarui tanpa rilis
> baru. Panduan ini untuk membangun berkas instalasinya.

## Yang dibutuhkan

- Komputer dengan Node.js 20+.
- Windows: untuk membangun `.exe` (NSIS). Mac: untuk `.dmg`.
  Linux: untuk `.AppImage` (tambahkan target di `package.json`).

## Langkah

### 1. Pasang dependensi

```sh
cd native/desktop
npm install
```

### 2. Jalankan (uji)

```sh
npm start
```

Jendela 1280x800 terbuka dan memuat
`https://aplikasi-introspeksi-umkm.vercel.app`. Yang wajib dicoba:
masuk akun, buka Mode Kasir, jual satu barang, buka PPOB, dan cetak
struk lewat dialog cetak sistem (Ctrl+P).

### 3. Bangun berkas rilis

```sh
npm run dist
```

Hasilnya ada di `native/desktop/dist/`:

- Windows: `UMKM Tumbuh Setup 1.0.0.exe`
- Mac: `UMKM Tumbuh-1.0.0.dmg`
- Linux: `UMKM Tumbuh-1.0.0.AppImage` (bila target ditambahkan)

Bagikan berkas itu langsung ke pengguna (atau unggah ke situs
usaha). Tidak ada toko aplikasi untuk desktop — tidak perlu akun
pengembang.

### 4. Sesudah rilis

- Pembaruan web **tidak perlu rilis baru** — aplikasi memuat URL live.
- Rilis baru hanya diperlukan bila `main.js` atau `package.json`
  berubah: naikkan `version`, ulangi langkah 3.
- **Printer:** keragaman printer desktop besar (inkjet, laser,
  termal USB). Yang didukung pasti: cetak lewat dialog sistem
  (struk/ laporan) dan struk WhatsApp. Cetak termal Bluetooth
  memakai Web Bluetooth Chromium — **belum teruji di perangkat
  nyata**; cetak termal USB lewat driver printer masing-masing
  (pilih printer termal di dialog cetak). Bila satu model printer
  bermasalah, laporkan merek/modelnya — jangan mengubah kode cetak
  tanpa mengujinya di printer itu.
- **Mode luring:** aplikasi desktop memuat URL live, jadi butuh
  internet seperti versi web. Penjualan luring di kasir tetap jalan
  di dalam aplikasi (disimpan lalu dikirim saat online) — sama
  seperti di web.
