import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [vue()]
  
  // Only load electron plugins when in electron mode
  if (mode === 'electron') {
    plugins.push(electron({
      entry: 'electron/main.js',
    }))
    plugins.push(electronRenderer())
  }
  
  return {
    plugins,
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001', // 更新端口为3001
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'terser'
    }
  }
})