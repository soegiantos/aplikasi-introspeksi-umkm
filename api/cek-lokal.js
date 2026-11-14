// Vercel Serverless Function: /api/cek-lokal
// Membaca halaman PUBLIK yang ditempel pengguna (profil Google Maps, toko
// marketplace, media sosial) dan mengekstrak sinyal sederhana: nama, rating,
// jumlah ulasan, kisaran harga. Bukan login, bukan scraping berbayar, dan
// bukan verifikasi resmi — hasilnya selalu ditandai sebagai sinyal publik
// yang masih perlu dikonfirmasi pengguna.
// Deploy: file ini di api/cek-lokal.js pada root proyek Vercel.
//
// GOOGLE MAPS — JALUR RESMI (Places API, New):
// Bila env GOOGLE_PLACES_API_KEY tersedia, tautan Google Maps dicek lewat
// Google Places API Text Search (resmi, stabil): nama tempat diambil dari
// tautan, lalu dicari dan dikembalikan rating + jumlah ulasan + alamat.
// Kunci TIDAK PERNAH ditulis di kode — hanya di Vercel Environment Variables.
// Bila kunci belum ada, dipakai jalur baca-halaman (sering diblokir Google)
// dan aplikasi menampilkan pesan jujur "cek manual".
// Marketplace/media sosial masih jalur baca-halaman; API resmi mereka butuh
// otorisasi pemilik toko dan dibuat terpisah bila sudah ada.

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

/* ---- Google Places API (New): Text Search ---- */
function namaTempatDariUrl(u) {
  // /maps/place/Nama+Tempat/@lat,lng  atau  ?q=Nama+Tempat  atau  /maps/search/Nama
  const m = u.pathname.match(/\/(?:place|search)\/([^/@]+)/);
  if (m) {
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")).trim(); } catch { return m[1].replace(/\+/g, " ").trim(); }
  }
  const q = u.searchParams.get("q") || u.searchParams.get("query");
  if (q) return q.trim();
  return "";
}

async function cekGooglePlaces(u, kotaHint) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { status: "no-key" };
  const nama = namaTempatDariUrl(u);
  if (!nama) return { status: "no-name" };
  const query = kotaHint ? `${nama}, ${kotaHint}` : nama;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.id",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "id", maxResultCount: 1 }),
    });
    clearTimeout(timer);
    if (!r.ok) {
      return { status: "error", http: r.status };
    }
    const j = await r.json();
    const p = (j.places || [])[0];
    if (!p) return { status: "not-found" };
    const signals = {};
    if (p.displayName && p.displayName.text) signals.nama_tempat = p.displayName.text;
    if (typeof p.rating === "number") signals.rating = String(p.rating);
    if (typeof p.userRatingCount === "number") signals.ulasan = String(p.userRatingCount);
    if (p.formattedAddress) signals.alamat = p.formattedAddress;
    if (p.id) signals.place_id = p.id;
    return { status: Object.keys(signals).length ? "ok" : "not-found", signals };
  } catch (e) {
    clearTimeout(timer);
    return { status: "error" };
  }
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
  const kotaHint = String((body && body.kota) || "").trim();
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

  /* Jalur resmi Google Maps lebih dulu bila ini tautan Google/Maps. */
  const isGoogle = /google|maps/i.test(u.hostname);
  if (isGoogle) {
    const g = await cekGooglePlaces(u, kotaHint);
    if (g.status === "ok") {
      return res.status(200).json({
        ok: true,
        sumber: "Google Maps / profil bisnis (API resmi Google Places)",
        url: u.toString(),
        signals: g.signals,
        diperiksa_pada: new Date().toISOString(),
        catatan: "Data dari Google Places API — sinyal publik, bukan verifikasi resmi. Konfirmasi kebenarannya sebelum dipakai.",
      });
    }
    if (g.status === "not-found") {
      return res.status(200).json({ ok: false, error: "Tempat tidak ditemukan di Google Maps dengan nama dari tautan itu. Periksa ejaan nama usahanya, atau gunakan cek manual." });
    }
    if (g.status === "error") {
      return res.status(200).json({ ok: false, error: "Layanan Google Places sedang tidak bisa menjawab. Gunakan cek manual." });
    }
    /* "no-key" / "no-name": lanjut ke jalur baca-halaman di bawah. */
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
