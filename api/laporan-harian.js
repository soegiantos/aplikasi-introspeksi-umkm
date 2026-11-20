// Vercel Serverless Function: /api/laporan-harian
// ------------------------------------------------------------
// Mengirim ringkasan harian UMKM Tumbuh ke email akun pemilik usaha.
// Dipakai aplikasi saat pemilik menekan "Kirim ringkasan sekarang" dan
// saat pemeriksaan otomatis sesudah jam kirim yang dipilih pemilik.
//
// Keamanan: pengirim HANYA ke email akun yang masuk (diambil dari sesi
// Supabase yang diverifikasi di sini) — alamat email dari badan permintaan
// tidak pernah dipakai, supaya endpoint ini tidak bisa dipakai mengirim
// surat ke sembarang alamat. Isi ringkasan dibatasi 8.000 karakter.
//
// Pengiriman memakai layanan email yang sudah berjalan (Brevo, pengirim
// soegianto@fst.unair.ac.id — sama seperti surat konfirmasi akun).
// Kunci API Brevo dibaca dari environment Vercel BREVO_API_KEY; bila belum
// dipasang, endpoint menjawab 503 dengan penanda belum_aktif dan aplikasi
// menampilkan penjelasan ramah (bukan galat merah).
// ------------------------------------------------------------

const SUPABASE_URL = "https://bdnqsxwypbrdiwaxydoh.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbnFzeHd5cGJyZGl3YXh5ZG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTQ3NDUsImV4cCI6MjExMDE3MDc0NX0.MsdIzw-CAqJiBp3McXZ-6XLzLakmo0S5w7RhHHXMCQc";
const PENGIRIM_EMAIL = "soegianto@fst.unair.ac.id";
const PENGIRIM_NAMA = "UMKM Tumbuh";

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Hanya POST yang diizinkan." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      belum_aktif: true,
      error: "Layanan email ringkasan harian belum diaktifkan.",
    });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return res.status(401).json({ ok: false, error: "Sesi tidak ditemukan — masuk lagi, lalu coba lagi." });
  }

  let user = null;
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token },
    });
    if (!r.ok) {
      return res.status(401).json({ ok: false, error: "Sesi tidak berlaku — masuk lagi, lalu coba lagi." });
    }
    user = await r.json();
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Tidak bisa memeriksa sesi — periksa internet, lalu coba lagi." });
  }

  const email = user && user.email;
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email akun tidak ditemukan." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Isi permintaan tidak dapat dibaca." });
    }
  }

  const subjek =
    typeof body?.subjek === "string" && body.subjek.trim()
      ? body.subjek.slice(0, 120)
      : "Ringkasan harian UMKM Tumbuh";
  const isi = typeof body?.isi === "string" ? body.isi.slice(0, 8000) : "";
  if (!isi.trim()) {
    return res.status(400).json({ ok: false, error: "Ringkasan masih kosong." });
  }

  try {
    const kirim = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { name: PENGIRIM_NAMA, email: PENGIRIM_EMAIL },
        to: [{ email }],
        subject: subjek,
        textContent: isi,
        htmlContent:
          "<pre style='font-family:Arial,sans-serif;white-space:pre-wrap'>" + escHtml(isi) + "</pre>",
      }),
    });
    if (!kirim.ok) {
      return res.status(502).json({ ok: false, error: "Email belum terkirim — layanan email sedang bermasalah. Coba lagi nanti." });
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Email belum terkirim — layanan email sedang bermasalah. Coba lagi nanti." });
  }

  return res.status(200).json({ ok: true, terkirim_ke: email });
}
