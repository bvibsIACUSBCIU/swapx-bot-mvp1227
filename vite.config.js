import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Vite 配置文件 - 支持ethers.js在浏览器运行
export default defineConfig({
  plugins: [
    react(),
    // 添加 Node.js polyfills 支持 ethers.js 等库
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // 确保 ethers.js 可以在浏览器环境运行
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  server: {
    port: 5173,
    open: true, // 自动打开浏览器
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
