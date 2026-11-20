// Vercel Serverless Function: /api/pesanan-online
// ------------------------------------------------------------
// Menerima pesanan dari halaman toko online / QR meja (publik, tanpa sesi)
// dan menyimpannya ke tabel pesanan_online untuk dibaca pemilik usaha di
// aplikasi ("Pesanan online masuk").
//
// Keamanan: token toko DIVERIFIKASI dulu lewat RPC portal_snapshot (sama
// seperti halaman toko publik) — token yang bukan milik toko yang aktif
// ditolak 401. Total dihitung ulang dari barang, supaya jumlah yang
// disimpan tidak bisa diubah dari sisi pelanggan. Tidak ada data keuangan
// pelanggan di sini — pembayaran tetap diselesaikan di kasir, aplikasi
// ini bukan gerbang pembayaran.
//
// SQL yang harus dijalankan sekali di Supabase SQL Editor (proyek
// bdnqsxwypbrdiwaxydoh):
//
//   create table if not exists public.pesanan_online (
//     id uuid primary key default gen_random_uuid(),
//     token text not null,
//     meja text not null default '',
//     pelanggan_nama text not null,
//     pelanggan_wa text not null default '',
//     items jsonb not null default '[]'::jsonb,
//     total numeric not null default 0,
//     sumber text not null default 'toko online',
//     catatan text not null default '',
//     status text not null default 'baru',
//     created_at timestamptz not null default now()
//   );
//   alter table public.pesanan_online enable row level security;
//   -- Sisipan dari endpoint ini (token sudah diverifikasi di atas).
//   create policy "pesanan_online sisip" on public.pesanan_online
//     for insert with check (true);
//   -- Baca HANYA lewat fungsi di bawah (token harus persis) — tidak ada
//   -- kebijakan select langsung, supaya satu akun tidak bisa membaca
//   -- pesanan toko lain.
//   create or replace function public.pesanan_online_muat(p_token text)
//   returns setof public.pesanan_online
//   language sql security definer stable as $$
//     select * from public.pesanan_online
//     where token = p_token order by created_at desc limit 50;
//   $$;
//   grant execute on function public.pesanan_online_muat(text)
//     to anon, authenticated;
//
// Sampai SQL di atas dijalankan, endpoint menjawab 503 dengan penanda
// belum_aktif dan halaman toko memakai jalan kembali WhatsApp.
// ------------------------------------------------------------

const SUPABASE_URL = "https://bdnqsxwypbrdiwaxydoh.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbnFzeHd5cGJyZGl3YXh5ZG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTQ3NDUsImV4cCI6MjExMDE3MDc0NX0.MsdIzw-CAqJiBp3McXZ-6XLzLakmo0S5w7RhHHXMCQc";

function potong(s, maks) {
  return String(s || "").trim().slice(0, maks);
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

  const token = potong(body.token, 100);
  if (!token) {
    return res.status(400).json({ ok: false, error: "Tautan toko tidak ditemukan." });
  }
  const meja = potong(body.meja, 20);
  const nama = potong(body.pelanggan && body.pelanggan.nama, 100);
  if (!nama) {
    return res.status(400).json({ ok: false, error: "Tulis nama Anda dulu." });
  }
  const wa = potong(body.pelanggan && body.pelanggan.wa, 30);
  const itemsMentah = Array.isArray(body.items) ? body.items : [];
  if (!itemsMentah.length || itemsMentah.length > 50) {
    return res.status(400).json({ ok: false, error: "Pilih dulu barang yang mau dipesan." });
  }
  const items = [];
  let total = 0;
  for (const it of itemsMentah) {
    if (!it || typeof it !== "object") continue;
    const qty = Math.round(+it.qty || 0);
    const harga = Math.max(0, Math.round(+it.harga || 0));
    const namaBarang = potong(it.nama, 120);
    if (!namaBarang || qty < 1 || qty > 999) continue;
    items.push({ stokCid: potong(it.stokCid, 100), nama: namaBarang, qty, harga });
    total += qty * harga;
  }
  if (!items.length) {
    return res.status(400).json({ ok: false, error: "Pilih dulu barang yang mau dipesan." });
  }

  // 1) Verifikasi token lewat RPC portal_snapshot (token harus milik toko aktif).
  let tokoAda = false;
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/portal_snapshot", {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ p_token: token }),
    });
    if (r.ok) {
      const j = await r.json();
      tokoAda = Array.isArray(j) ? j.length > 0 : !!j;
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Tidak bisa memeriksa tautan toko — periksa internet, lalu coba lagi." });
  }
  if (!tokoAda) {
    return res.status(401).json({ ok: false, error: "Tautan toko tidak ditemukan." });
  }

  // 2) Simpan pesanan.
  const baris = {
    token,
    meja,
    pelanggan_nama: nama,
    pelanggan_wa: wa,
    items,
    total,
    sumber: meja ? "qr-meja" : "toko online",
    catatan: "",
    status: "baru",
  };
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pesanan_online", {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(baris),
    });
    if (!r.ok) {
      // Tabel belum dibuat (SQL belum dijalankan) → 503 ramah, halaman toko
      // memakai jalan kembali WhatsApp.
      if (r.status === 404 || r.status === 400) {
        return res.status(503).json({
          ok: false,
          belum_aktif: true,
          error: "Pesanan online belum diaktifkan untuk toko ini.",
        });
      }
      return res.status(502).json({ ok: false, error: "Pesanan belum terkirim — coba lagi nanti." });
    }
    const j = await r.json();
    const id = Array.isArray(j) && j[0] ? j[0].id : null;
    return res.status(200).json({ ok: true, pesanan_id: id });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Pesanan belum terkirim — coba lagi nanti." });
  }
}
