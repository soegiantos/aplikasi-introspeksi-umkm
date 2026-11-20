// Vercel Serverless Function: /api/ppob
// ------------------------------------------------------------
// Jalur server untuk PPOB (pulsa, paket data, token listrik) UMKM
// Tumbuh — Gelombang 7.
//
// STATUS SAAT INI: BELUM AKTIF. Sesuai keputusan Bab 14 peta jalan,
// PPOB ditunda sampai ada mitra dengan pengembalian saldo OTOMATIS
// yang tercatat. Selama belum ada mitra, endpoint ini menjawab 503
// dengan penanda belum_aktif dan aplikasi tetap dalam MODE CONTOH:
// pesanan hanya tercatat di riwayat PPOB, tidak masuk pembukuan, dan
// tidak ada transaksi nyata.
//
// YANG DIPERLUKAN AGAR LIVE (langkah pemilik usaha):
//   1. Pilih mitra PPOB (aggregator pulsa/listrik) dan daftar.
//   2. Isi deposit/saldo di mitra itu.
//   3. Simpan di Vercel (aplikasi-introspeksi-umkm → Settings →
//      Environment Variables):
//        PPOB_MITRA    = nama mitra (contoh: Mitra Pulsa Nusantara)
//        PPOB_API_URL  = alamat endpoint beli mitra
//        PPOB_API_KEY  = kunci API mitra (JANGAN taruh di kode/repo)
//   4. Aktifkan mode live dari layar PPOB di aplikasi (pengaturan
//      tetap menolak bila env di atas belum terisi).
//
// KONTRAK MITRA (yang diharapkan endpoint ini dari PPOB_API_URL):
//   Permintaan  POST PPOB_API_URL
//     header: Authorization: Bearer <PPOB_API_KEY>
//     body:   { produk, tujuan, harga_mitra }
//   Jawaban berhasil (HTTP 200):
//     { ok: true, serial: "SN-...", saldo_dikembalikan: 0 }
//   Jawaban gagal (HTTP 200 dengan ok:false, atau 4xx/5xx):
//     { ok: false, error: "alasan", saldo_dikembalikan: <rupiah> }
//   Bila transaksi gagal SETELAH saldo terpotong, mitra WAJIB
//   mengembalikan saldo dan melaporkannya di saldo_dikembalikan —
//   tanpa itu, kerugian ditanggung pemilik usaha dan dicatat di
//   riwayat PPOB (lihat g7-ppob.js). Jangan sambungkan mitra yang
//   tidak memberi pengembalian saldo otomatis dan tercatat.
//
// KEAMANAN: kunci API hanya dibaca dari environment server — tidak
// pernah dikirim ke peramban dan tidak pernah tertulis di repo.
// Endpoint ini tidak menyimpan apa pun ke database; pencatatan
// pembukuan dilakukan aplikasi (g7-ppob.js) sesudah mitra menjawab
// berhasil. Validasi di sini (produk dikenal, tujuan sah, harga
// tidak negatif) mencegah permintaan asal-asalan dari luar.
// ------------------------------------------------------------

function potong(s, maks) {
  return String(s || "").trim().slice(0, maks);
}

const PRODUK_SAH = new Set([
  "ppob-pulsa-telkomsel-10", "ppob-pulsa-telkomsel-20", "ppob-pulsa-telkomsel-50",
  "ppob-pulsa-indosat-10", "ppob-pulsa-indosat-20", "ppob-pulsa-indosat-50",
  "ppob-pulsa-xl-10", "ppob-pulsa-xl-20", "ppob-pulsa-xl-50",
  "ppob-pulsa-tri-10", "ppob-pulsa-tri-20", "ppob-pulsa-tri-50",
  "ppob-data-1gb", "ppob-data-3gb", "ppob-data-10gb", "ppob-data-25gb",
  "ppob-token-20", "ppob-token-50", "ppob-token-100", "ppob-token-200",
]);

function tujuanSah(tujuan, produk) {
  const t = String(tujuan || "").trim();
  if (String(produk || "").indexOf("ppob-token-") === 0) return /^\d{11,12}$/.test(t);
  let d = t.replace(/\D/g, "");
  if (d.indexOf("62") === 0) d = "0" + d.slice(2);
  return /^08\d{8,11}$/.test(d);
}

function belumAktif(res) {
  return res.status(503).json({
    ok: false,
    belum_aktif: true,
    error:
      "PPOB belum diaktifkan — belum ada mitra PPOB. Pesanan tetap bisa dicoba dalam mode contoh di aplikasi.",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Hanya POST yang diizinkan." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Isi permintaan tidak dapat dibaca." });
    }
  }
  body = body && typeof body === "object" ? body : {};
  const aksi = potong(body.aksi, 20) || "beli";

  // Cek kesiapan (dipakai aplikasi sebelum menyalakan mode live).
  if (aksi === "cek") {
    if (!process.env.PPOB_API_KEY || !process.env.PPOB_API_URL) return belumAktif(res);
    return res.status(200).json({ ok: true, aktif: true, mitra: process.env.PPOB_MITRA || "" });
  }
  if (aksi !== "beli") {
    return res.status(400).json({ ok: false, error: "Aksi tidak dikenal." });
  }

  // Validasi isi — sebelum menyentuh mitra mana pun.
  const produk = potong(body.produk, 60);
  if (!PRODUK_SAH.has(produk)) {
    return res.status(400).json({ ok: false, error: "Produk PPOB tidak dikenal." });
  }
  const tujuan = potong(body.tujuan, 30);
  if (!tujuanSah(tujuan, produk)) {
    return res.status(400).json({ ok: false, error: "Nomor tujuan tidak benar." });
  }
  const hargaMitra = Math.round(+body.hargaMitra || 0);
  if (!(hargaMitra > 0)) {
    return res.status(400).json({ ok: false, error: "Harga mitra tidak benar." });
  }

  // Belum ada mitra → 503. Aplikasi tetap dalam mode contoh.
  if (!process.env.PPOB_API_KEY || !process.env.PPOB_API_URL) return belumAktif(res);

  // Teruskan ke mitra.
  let j = null;
  try {
    const r = await fetch(process.env.PPOB_API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.PPOB_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ produk, tujuan, harga_mitra: hargaMitra }),
    });
    try {
      j = await r.json();
    } catch {
      j = null;
    }
    if (!r.ok || !j || j.ok !== true) {
      return res.status(502).json({
        ok: false,
        error: (j && j.error) || "Mitra PPOB tidak bisa memproses pesanan ini.",
        saldo_dikembalikan: (j && +j.saldo_dikembalikan) || 0,
      });
    }
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: "Tidak bisa menghubungi mitra PPOB — periksa internet, lalu coba lagi.",
      saldo_dikembalikan: 0,
    });
  }
  return res.status(200).json({
    ok: true,
    serial: String((j && j.serial) || ""),
    saldo_dikembalikan: (j && +j.saldo_dikembalikan) || 0,
  });
}
