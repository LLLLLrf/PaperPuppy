import { app as t, BrowserWindow as s } from "electron";
import r from "path";
import { fileURLToPath as c } from "url";
const d = c(import.meta.url), n = r.dirname(d);
function i() {
  const e = new s({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: r.join(n, "preload.js"),
      nodeIntegration: !0,
      contextIsolation: !1
    }
  });
  process.env.VITE_DEV_SERVER_URL ? (e.loadURL(process.env.VITE_DEV_SERVER_URL), e.webContents.openDevTools()) : e.loadFile(r.join(n, "../dist/index.html"));
}
t.whenReady().then(async () => {
  const e = await import("path"), a = await import("./main-HISK49CH.js").then((o) => o.m), l = (await import("module")).createRequire(import.meta.url);
  a.default.config({ path: e.default.join(n, "server", ".env") });
  try {
    const o = l("./server/server.js");
    console.log("Server started successfully");
  } catch (o) {
    console.error("Failed to start server:", o);
  }
  i(), t.on("activate", () => {
    s.getAllWindows().length === 0 && i();
  });
});
t.on("window-all-closed", () => {
  process.platform !== "darwin" && t.quit();
});
