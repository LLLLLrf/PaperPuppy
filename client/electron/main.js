import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前目录路径（ES模块兼容）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 创建窗口函数
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 加载页面
  if (process.env.VITE_DEV_SERVER_URL) {
    // 开发模式下加载Vite开发服务器
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 开发模式下打开开发者工具
    win.webContents.openDevTools()
  } else {
    // 生产模式下加载打包后的index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
  createWindow()

  // macOS下点击Dock图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 关闭所有窗口时退出应用（Windows和Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
