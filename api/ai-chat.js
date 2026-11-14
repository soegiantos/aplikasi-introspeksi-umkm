// Vercel Serverless Function: /api/ai-chat
// ------------------------------------------------------------
// README (baca dulu sebelum deploy):
// 1. File ini harus ikut ter-deploy BERSAMA aplikasi, di folder
//    api/ pada root proyek Vercel (api/ai-chat.js).
// 2. Di Vercel Dashboard, buka proyek aplikasi-introspeksi-umkm,
//    lalu Settings -> Environment Variables, tambahkan:
//       DEEPSEEK_API_KEY = <kunci DeepSeek Bapak>
//    Pilih Production (dan Preview bila perlu), lalu Save.
//    JANGAN pernah menulis kunci itu di kode aplikasi, di HTML,
//    di chat, atau di file ini.
// 3. Redeploy proyek setelah menambah environment variable.
// 4. Drop to Deploy (unggah satu file HTML statis saja) TIDAK
//    bisa menjalankan fungsi ini. Proyek harus di-deploy dari
//    Git atau dari Vercel CLI dengan folder api/ ikut serta.
// 5. Kalau kunci belum diset, fungsi ini menjawab 503 dengan
//    pesan yang ramah, dan aplikasi memakai penjelasan lokal
//    dari perhitungannya sendiri.
// ------------------------------------------------------------
// Peran fungsi ini: hanya meneruskan pertanyaan penjelasan ke
// DeepSeek. DeepSeek HANYA menjelaskan dan membuat draf teks.
// Angka (valuasi, skor, HPP, BEP) tetap dihitung oleh rumus
// di halaman aplikasi, bukan oleh DeepSeek.

export default async function handler(req, res) {
  // Hanya izinkan POST.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Hanya POST yang diizinkan." });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // Kunci belum diset di Vercel: beri tahu aplikasi dengan jelas.
    return res.status(503).json({
      error: "AI online belum tersambung. Periksa DEEPSEEK_API_KEY di pengaturan Vercel.",
    });
  }

  let body = req.body;
  // Vercel kadang memberi body sebagai string; parse bila perlu.
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Isi permintaan tidak dapat dibaca." });
    }
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const context = typeof body?.context === "string" ? body.context.trim() : "";

  if (!prompt) {
    return res.status(400).json({ error: "Pertanyaan tidak boleh kosong." });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: "Pertanyaan terlalu panjang (maksimal 2000 karakter)." });
  }
  // Batasi konteks angka yang dikirim, jangan kirim data pribadi.
  const safeContext = context.slice(0, 1500);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah AI Coach untuk pemilik UMKM di Indonesia. " +
              "Jawab dengan Bahasa Indonesia yang sederhana, singkat, dan ramah, " +
              "seolah menjelaskan kepada pemilik warung atau toko kecil. " +
              "Kamu HANYA menjelaskan dan membuat draf teks. " +
              "Jangan pernah membuat angka valuasi, skor, HPP, atau BEP baru. " +
              "Gunakan hanya angka yang sudah diberikan di konteks. " +
              "Jika konteks tidak memberi angka, katakan bahwa angka itu harus dihitung dari data usaha, jangan menebak. " +
              "Jangan sebut kata bank, kredit, atau KUR. Gunakan istilah investasi dan kerjasama investasi. " +
              "Bila kamu perlu bertanya balik kepada pengguna, ajukan MAKSIMAL satu pertanyaan sederhana dalam satu jawaban, " +
              "pakai bahasa sehari-hari yang mudah dijawab, dan akhiri jawaban itu dengan kalimat persis ini: " +
              "\"Silakan jawab di kolom chat di bawah ini.\"",
          },
          {
            role: "user",
            content: safeContext
              ? `Konteks dari perhitungan aplikasi:\n${safeContext}\n\nPertanyaan pengguna:\n${prompt}`
              : prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("DeepSeek error:", response.status, text.slice(0, 300));
      return res.status(502).json({
        error: "AI online sedang tidak bisa menjawab. Coba lagi sebentar lagi.",
      });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!answer) {
      return res.status(502).json({
        error: "AI online tidak memberi jawaban. Coba lagi sebentar lagi.",
      });
    }
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("AI proxy error:", err);
    return res.status(502).json({
      error: "AI online sedang tidak bisa dihubungi. Coba lagi sebentar lagi.",
    });
  }
}
