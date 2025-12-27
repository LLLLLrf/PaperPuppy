// preload.js
// 在渲染进程中可以访问的API
const { contextBridge } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 可以在这里添加需要的API
})
