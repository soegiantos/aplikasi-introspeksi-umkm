# Aplikasi Introspeksi UMKM

Aplikasi web untuk pemilik UMKM: valuasi usaha (3 metode), dashboard level
UMKM (PP 7/2021), introspeksi 9 modul, HPP, laporan SAK EMKM, dan AI Coach
yang dipandu langkah demi langkah. Bahasa aplikasi: Bahasa Indonesia.

## Struktur

- `index.html` — seluruh aplikasi (satu file statis, mode gelap, mode HP)
- `api/ai-chat.js` — Vercel Serverless Function `POST /api/ai-chat`.
  Meneruskan pertanyaan penjelasan ke DeepSeek. DeepSeek hanya menjelaskan
  dan membuat draf teks; angka (valuasi, skor, HPP, BEP) tetap dihitung oleh
  rumus di `index.html`.
- `package.json` — `"type": "module"`, tanpa dependensi (fungsi memakai
  `fetch` bawaan Node).
- `vercel.json` — tanpa framework; Vercel otomatis menemukan fungsi di
  folder `api/`.

## Deploy ke Vercel (dari Git)

1. Push repo ini ke GitHub, lalu hubungkan ke proyek Vercel
   `aplikasi-introspeksi-umkm` (tim dosen3). Setiap push ke branch
   production akan men-deploy ulang secara otomatis.
2. Di Vercel Dashboard, buka proyek → **Settings → Environment
   Variables**, tambahkan:
   - Name: `DEEPSEEK_API_KEY`
   - Value: kunci API DeepSeek Anda
   - Environment: Production (centang juga Preview bila perlu)
   Lalu **Save** dan **Redeploy**.
3. Uji di aplikasi live: buka "Tanya AI Coach", ajukan pertanyaan.
   Jika kunci belum diset, fungsi menjawab 503 dan aplikasi memakai
   penjelasan lokal dari perhitungannya sendiri.

## Keamanan — baca ini dulu

- **Jangan pernah menulis kunci API di kode, di HTML, di chat, atau di
  file `.env` yang di-commit.** Kunci hanya disimpan sebagai
  Environment Variable di Vercel Dashboard.
- File `.env` sudah masuk `.gitignore` dan tidak boleh di-commit.
- Jangan pernah memasukkan `service_role` / secret key Supabase ke
  repo ini; di aplikasi, penyimpanan cloud hanya disebut "cloud".

## Catatan

Deploy "Drop to Deploy" (unggah satu file HTML statis saja) **tidak**
bisa menjalankan `api/ai-chat.js`. Fungsi server hanya jalan bila
proyek di-deploy dari Git atau Vercel CLI dengan folder `api/` ikut
serta.
