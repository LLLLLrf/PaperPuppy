import { app as e, BrowserWindow as r } from "electron";
import n from "path";
import { fileURLToPath as a } from "url";
const l = a(import.meta.url), t = n.dirname(l);
function i() {
  const o = new r({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: n.join(t, "preload.js"),
      nodeIntegration: !0,
      contextIsolation: !1
    }
  });
  process.env.VITE_DEV_SERVER_URL ? (o.loadURL(process.env.VITE_DEV_SERVER_URL), o.webContents.openDevTools()) : o.loadFile(n.join(t, "../dist/index.html"));
}
e.whenReady().then(() => {
  i(), e.on("activate", () => {
    r.getAllWindows().length === 0 && i();
  });
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
