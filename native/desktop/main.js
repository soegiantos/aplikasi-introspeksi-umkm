// Aplikasi desktop UMKM Tumbuh (Electron) — Gelombang 7.
// Memuat aplikasi web live, bukan salinan kode: sekali web diperbarui,
// aplikasi desktop ikut diperbarui tanpa rilis baru. Versi web tetap
// menjadi jalur pembaruan utama (keputusan Bab 14 peta jalan).
// Jalankan: npm install lalu npm start. Bangun rilis: npm run dist.
const { app, BrowserWindow, Menu } = require("electron");

const URL_LIVE = "https://aplikasi-introspeksi-umkm.vercel.app";

function buatJendela() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "UMKM Tumbuh",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Cetak termal Bluetooth memakai Web Bluetooth dari Chromium;
      // belum teruji di perangkat nyata (warisan Gelombang 2/3).
    },
  });
  win.loadURL(URL_LIVE);
  // Menu minimal — tanpa alat pengembang di rilis (tetap ada lewat
  // pintasan bila dibutuhkan saat pendampingan).
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { label: "UMKM Tumbuh", submenu: [{ role: "quit", label: "Keluar" }] },
      {
        label: "Tampilan",
        submenu: [
          { role: "reload", label: "Muat ulang" },
          { role: "togglefullscreen", label: "Layar penuh" },
          { role: "toggleDevTools", label: "Alat pengembang" },
        ],
      },
    ])
  );
}

app.whenReady().then(buatJendela);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) buatJendela();
});
