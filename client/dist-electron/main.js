import { BrowserWindow, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url), __dirname = path.dirname(__filename);
function createWindow() {
	let o = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		}
	});
	process.env.VITE_DEV_SERVER_URL ? (o.loadURL(process.env.VITE_DEV_SERVER_URL), o.webContents.openDevTools()) : o.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(() => {
	createWindow(), app.on("activate", () => {
		BrowserWindow.getAllWindows().length === 0 && createWindow();
	});
}), app.on("window-all-closed", () => {
	process.platform !== "darwin" && app.quit();
});
