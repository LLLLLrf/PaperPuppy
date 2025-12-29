// API服务器配置
// 在Electron模式下，替换为实际的服务器IP地址或域名
// 例如：'http://your-server-ip:3001/api'
const API_CONFIG = {
  // 开发环境 - 本地服务器
  development: {
    baseURL: 'http://localhost:3001/api'
  },
  // 生产环境 - 远程服务器
  production: {
    baseURL: 'http://your-server-ip:3001/api' // 替换为您的服务器IP地址
  },
  // Electron环境 - 默认使用生产环境配置
  electron: {
    baseURL: 'http://your-server-ip:3001/api' // 替换为您的服务器IP地址
  }
};

export default API_CONFIG;