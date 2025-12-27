import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 初始化日志
import { logInfo } from './utils/logger'
logInfo('SwapX Trading Bot 启动')

// 开发环境加载测试工具
if (import.meta.env.DEV) {
  import('./test-storage.js')
  import('./test-swap.js')
  import('./test-balance.js')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
