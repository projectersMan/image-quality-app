import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          // 如果没有本地API服务器，则模拟响应
          proxy.on('error', (err, req, res) => {
            console.log('API代理错误:', err.message);
          });
        }
      }
    }
  }
})