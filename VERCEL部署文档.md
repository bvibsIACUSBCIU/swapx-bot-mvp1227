# SwapX Bot MVP - Vercel 部署文档

## 📋 目录
- [前置要求](#前置要求)
- [部署步骤](#部署步骤)
- [环境配置](#环境配置)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

---

## 前置要求

### 1. 账号准备
- ✅ GitHub 账号
- ✅ Vercel 账号（可使用 GitHub 登录）

### 2. 项目准备
- ✅ 项目已推送到 GitHub 仓库
- ✅ 本地构建测试通过（运行 `npm run build`）

---

## 部署步骤

### 方式一：通过 Vercel 网站部署（推荐）

#### 1. 连接 GitHub 仓库

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 **"Add New..."** → **"Project"**
4. 选择你的 `swapx-bot-mvp` 仓库
5. 点击 **"Import"**

#### 2. 配置项目设置

在导入页面配置以下选项：

```yaml
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node Version: 18.x
```

#### 3. 构建和部署

1. 点击 **"Deploy"** 开始部署
2. 等待构建完成（通常需要 1-3 分钟）
3. 部署成功后会显示预览链接

---

### 方式二：通过 Vercel CLI 部署

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署项目

```bash
# 首次部署（会进行配置）
vercel

# 部署到生产环境
vercel --prod
```

---

## 环境配置

### 项目文件检查清单

确保以下文件存在且配置正确：

#### ✅ package.json
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@uniswap/sdk-core": "^4.2.0",
    "@uniswap/v2-sdk": "^3.3.0",
    "ethers": "^6.9.0"
  }
}
```

#### ✅ vite.config.js
确保包含正确的构建配置：
```javascript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})
```

#### ✅ vercel.json（可选，已自动创建）
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

## 常见问题

### ❌ 问题 1：无法解析 `@swapx-lib/sdk-core` 模块

**错误信息：**
```
Rollup failed to resolve import "@swapx-lib/sdk-core"
```

**原因：**
- 代码中使用了 `@swapx-lib/*` 包名
- 但 `package.json` 中安装的是 `@uniswap/*` 包

**解决方案：**
✅ **已修复** - 将导入改为：
```javascript
// 修改前（错误）
import { Token } from '@swapx-lib/sdk-core'
import { Pair } from '@swapx-lib/v2-sdk'

// 修改后（正确）
import { Token } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
```

---

### ❌ 问题 2：构建超时或内存不足

**错误信息：**
```
Build exceeded maximum duration
JavaScript heap out of memory
```

**解决方案：**

1. **优化依赖**
```bash
# 清理 node_modules 和 lock 文件
rm -rf node_modules package-lock.json
npm install
```

2. **增加 Node 内存限制**
在 `package.json` 中修改：
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

---

### ❌ 问题 3：环境变量未生效

**问题：**
生产环境访问不到本地开发的 RPC 节点或配置

**解决方案：**

1. 在 Vercel 项目设置中添加环境变量：
   - 进入项目 → Settings → Environment Variables
   - 添加必要的环境变量（如果有）

2. 确保代码中使用环境变量：
```javascript
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.xone.org/'
```

---

### ❌ 问题 4：路由 404 错误

**问题：**
刷新页面时出现 404 错误（SPA 路由问题）

**解决方案：**

创建 `vercel.json` 配置重写规则：
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 故障排查

### 1. 查看构建日志

在 Vercel 部署页面：
1. 点击部署记录
2. 查看 **"Building"** 步骤的详细日志
3. 查找错误信息和堆栈跟踪

### 2. 本地验证构建

在推送前本地测试：

```bash
# 安装依赖
npm install

# 清理缓存
rm -rf node_modules/.vite

# 构建项目
npm run build

# 预览构建结果
npm run preview
```

### 3. 检查依赖版本

确保 `package.json` 中的依赖版本兼容：

```bash
# 检查过期的包
npm outdated

# 更新到兼容版本
npm update
```

### 4. 强制重新部署

如果修改未生效：

```bash
# 通过 CLI 强制重新部署
vercel --prod --force

# 或在 Vercel 网站上点击 "Redeploy"
```

---

## 部署后验证

### ✅ 验证清单

1. **访问网站**
   - 打开 Vercel 提供的部署 URL
   - 确认页面正常加载

2. **功能测试**
   - 测试钱包导入功能
   - 测试交易策略配置
   - 检查日志显示是否正常

3. **控制台检查**
   - 打开浏览器开发者工具
   - 检查是否有报错信息
   - 确认网络请求正常

4. **移动端适配**
   - 在移动设备上访问
   - 确认响应式布局正常

---

## 持续部署

### 自动部署设置

Vercel 默认配置自动部署：

- ✅ **主分支推送** → 自动部署到生产环境
- ✅ **其他分支推送** → 自动创建预览部署
- ✅ **Pull Request** → 自动创建预览部署

### 自定义部署分支

在 `vercel.json` 中配置：

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  }
}
```

---

## 性能优化建议

### 1. 代码分割

Vite 自动进行代码分割，确保：
```javascript
// 使用动态导入
const Component = lazy(() => import('./Component'))
```

### 2. 静态资源优化

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'antd'],
          'ethers': ['ethers'],
          'uniswap': ['@uniswap/sdk-core', '@uniswap/v2-sdk']
        }
      }
    }
  }
})
```

### 3. 启用压缩

Vercel 默认启用 gzip/brotli 压缩，无需额外配置。

---

## 安全建议

### 1. 敏感信息保护

⚠️ **注意：**
- 不要在代码中硬编码私钥或助记词
- 所有私钥应在浏览器本地存储
- 不要将私钥提交到 Git 仓库

### 2. API 密钥管理

如果使用第三方 API：
```javascript
// 使用环境变量
const API_KEY = import.meta.env.VITE_API_KEY
```

在 Vercel 项目设置中配置环境变量。

---

## 监控和日志

### Vercel Analytics（可选）

启用 Vercel Analytics 查看网站性能：

1. 在项目设置中启用 Analytics
2. 安装依赖：
```bash
npm install @vercel/analytics
```

3. 在代码中添加：
```javascript
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  )
}
```

---

## 回滚部署

如果新部署出现问题：

1. 在 Vercel 项目页面
2. 找到之前的成功部署
3. 点击 **"..."** → **"Promote to Production"**
4. 确认回滚

---

## 联系支持

如遇到无法解决的问题：

- 📚 [Vercel 文档](https://vercel.com/docs)
- 💬 [Vercel 社区论坛](https://github.com/vercel/vercel/discussions)
- 🐛 [提交 Issue](https://github.com/vercel/vercel/issues)

---

## 附录：完整配置文件示例

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### .vercelignore
```
node_modules
.env
.env.local
*.log
.DS_Store
```

---

## 更新日志

- **2025-12-27**: 创建部署文档，修复 `@swapx-lib` 导入问题
- 问题已修复：将 `@swapx-lib/*` 改为 `@uniswap/*`
- 添加完整的故障排查指南和优化建议

---

**祝部署顺利！🚀**
