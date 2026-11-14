// Vercel Serverless Function: /api/cek-lokal
// Membaca halaman PUBLIK yang ditempel pengguna (profil Google Maps, toko
// marketplace, media sosial) dan mengekstrak sinyal sederhana: nama, rating,
// jumlah ulasan, kisaran harga. Bukan login, bukan scraping berbayar, dan
// bukan verifikasi resmi — hasilnya selalu ditandai sebagai sinyal publik
// yang masih perlu dikonfirmasi pengguna.
// Deploy: file ini di api/cek-lokal.js pada root proyek Vercel.
// Tidak butuh API key apa pun. Bila halaman memblokir (bot wall / login),
// kembalikan ok:false dan aplikasi memakai cek manual.

const ALLOW = [
  /(^|\.)google\.com$/i,
  /(^|\.)maps\.google\.com$/i,
  /(^|\.)tokopedia\.com$/i,
  /(^|\.)shopee\.co\.id$/i,
  /(^|\.)shopee\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)gofood\.co\.id$/i,
  /(^|\.)grab\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)facebook\.com$/i,
];

function sumberDari(host) {
  if (/google|maps/i.test(host)) return "Google Maps / profil bisnis";
  if (/tokopedia/i.test(host)) return "Tokopedia";
  if (/shopee/i.test(host)) return "Shopee";
  if (/instagram/i.test(host)) return "Instagram";
  if (/gofood/i.test(host)) return "GoFood";
  if (/grab/i.test(host)) return "GrabFood";
  if (/tiktok/i.test(host)) return "TikTok Shop";
  if (/facebook/i.test(host)) return "Facebook";
  return "Tautan publik";
}

function ambilAngka(text, re) {
  const m = text.match(re);
  return m ? m[1].replace(/\./g, "").replace(/,/g, ".") : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Hanya POST yang diizinkan." });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const url = String((body && body.url) || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "Tautan belum diisi." });
  let u;
  try {
    u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protokol");
  } catch {
    return res.status(400).json({ ok: false, error: "Tautan tidak valid. Tempel tautan lengkap diawali https://" });
  }
  if (!ALLOW.some((re) => re.test(u.hostname))) {
    return res.status(400).json({ ok: false, error: "Sumber ini belum didukung cek otomatis. Gunakan cek manual." });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UMKM-Introspeksi/1.0; +https://aplikasi-introspeksi-umkm.vercel.app/)",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!r.ok) {
      return res.status(200).json({ ok: false, error: `Halaman tidak bisa dibaca (status ${r.status}). Gunakan cek manual.` });
    }
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 200000);

    const signals = {};
    const rating = ambilAngka(text, /(\d[,.]\d)\s*(?:dari 5|out of 5|\/ ?5|bintang|★)/i)
      || ambilAngka(text, /rating[^0-9]{0,20}(\d[,.]\d)/i);
    if (rating) signals.rating = rating;
    const ulasan = ambilAngka(text, /([\d.,]+)\s*(?:rb|ribu)?\s*(?:ulasan|review|penilaian)/i)
      || ambilAngka(text, /\(([\d.,]+)\)\s*(?:ulasan|review)/i);
    if (ulasan) signals.ulasan = ulasan;
    const terjual = ambilAngka(text, /([\d.,]+)\s*(?:rb|ribu)?\s*terjual/i);
    if (terjual) signals.terjual = terjual;
    const harga = ambilAngka(text, /Rp\s*([\d.,]+)/);
    if (harga) signals.harga_terlihat = harga;
    const title = (html.match(/<title[^>]*>([^<]{1,120})<\/title>/i) || [])[1];
    if (title) signals.judul_halaman = title.trim();

    const adaSinyal = Object.keys(signals).length > 0;
    return res.status(200).json({
      ok: adaSinyal,
      sumber: sumberDari(u.hostname),
      url: u.toString(),
      signals,
      diperiksa_pada: new Date().toISOString(),
      error: adaSinyal ? undefined : "Halaman terbuka, tetapi tidak ditemukan sinyal (rating/ulasan/harga) yang bisa dibaca. Gunakan cek manual.",
      catatan: "Sinyal dari halaman publik — bukan verifikasi resmi. Konfirmasi kebenarannya sebelum dipakai.",
    });
  } catch (e) {
    clearTimeout(timer);
    return res.status(200).json({ ok: false, error: "Halaman tidak bisa dibaca otomatis (waktu habis atau diblokir). Gunakan cek manual." });
  }
}
