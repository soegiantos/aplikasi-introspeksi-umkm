// Vercel Serverless Function: /api/cek-email
// ------------------------------------------------------------
// Memeriksa apakah domain sebuah alamat email bisa menerima surat,
// lewat catatan MX (Mail Exchange) domainnya — memakai modul dns
// bawaan Node, tanpa layanan luar, tanpa kunci, tanpa biaya.
// Deploy: file ini di api/cek-email.js pada root proyek Vercel.
// Dipakai aplikasi saat pendaftaran SAJA: sebelum signUp, aplikasi
// menanyakan fungsi ini; cabang MASUK tidak diperiksa.
//
// Jawaban selalu 200 (kecuali method bukan POST atau emailnya
// tidak terbaca):
//   { ok:true, bisa:true }                domain punya catatan MX.
//   { ok:true, bisa:false }               domain tidak punya catatan MX
//                                          (tidak bisa menerima surat).
//   { ok:true, bisa:true, takPasti:true }  DNS gagal / waktu habis —
//                                          TIDAK PASTI, bukan "tidak
//                                          bisa". Aplikasi tetap
//                                          melanjutkan pendaftaran
//                                          (fail-open); email konfirmasi
//                                          tetap menjadi bukti akhir.
// ------------------------------------------------------------

import { promises as dns } from "node:dns";

const BATAS_WAKTU_MS = 5000;

function formatEmailBenar(email) {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email || "");
}

function domainDariEmail(email) {
  const at = (email || "").lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

async function adaMx(domain) {
  // true = punya catatan MX; false = pasti tidak punya MX;
  // null = tidak pasti (DNS gagal / waktu habis).
  try {
    const catatan = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, tolak) =>
        setTimeout(() => tolak(new Error("waktu habis")), BATAS_WAKTU_MS)
      ),
    ]);
    return Array.isArray(catatan) && catatan.length > 0;
  } catch (err) {
    const kode = err && err.code;
    if (kode === "ENODATA" || kode === "ENOTFOUND") return false;
    return null;
  }
}

export default async function handler(req, res) {
  // Hanya izinkan POST.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Hanya POST yang diizinkan." });
  }

  let body = req.body;
  // Vercel kadang memberi body sebagai string; parse bila perlu.
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Isi permintaan tidak dapat dibaca." });
    }
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 254 || !formatEmailBenar(email)) {
    return res.status(400).json({ ok: false, error: "Alamat emailnya belum benar." });
  }

  const domain = domainDariEmail(email);
  const hasil = await adaMx(domain);
  if (hasil === false) {
    return res.status(200).json({ ok: true, bisa: false });
  }
  if (hasil === null) {
    return res.status(200).json({ ok: true, bisa: true, takPasti: true });
  }
  return res.status(200).json({ ok: true, bisa: true });
}
