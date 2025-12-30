# SwapX Trading Bot - AI Coding Instructions

## 项目概览

这是一个基于 React + Vite 的去中心化交易机器人，用于在 SwapX V2（Uniswap V2 分叉）上自动执行交易策略。关键特性：
- **多机器人架构**：支持同时运行多个独立策略实例
- **纯前端应用**：所有数据存储在 localStorage，无后端依赖
- **三种策略**：低买高卖、DCA定投、网格交易

## 核心架构理念

### 代币双轨制（关键！）
- **XOC**：原生 Gas 代币，用于支付交易手续费（不参与交易）
- **WXOC**：ERC20 包装代币，实际交易标的（与 USDT 配对）
- 所有交易逻辑使用 WXOC，钱包需持有足够 XOC 作为 Gas

### 全局单例模式
[src/services/BotRunner.js](src/services/BotRunner.js) 是全局机器人管理器，独立于 React 生命周期。策略实例注册到此单例后，即使组件卸载也会持续运行。编辑机器人相关功能时：
```javascript
import botRunner from '../services/BotRunner'
// 注册策略后，机器人独立运行
botRunner.registerStrategy(botId, strategyInstance)
botRunner.startStrategy(botId)
```

### localStorage 作为数据库
所有状态持久化到 localStorage，使用 [src/utils/storage.js](src/utils/storage.js) 统一管理：
- `swapx_wallet` - 钱包信息（地址、私钥）
- `swapx_bots` - 机器人配置和状态
- `swapx_trades` - 交易历史记录
- `swapx_logs` / `swapx_trade_logs` - 系统日志和交易日志

## 策略实现规范

策略类位于 [src/services/strategies/](src/services/strategies/)，必须实现以下接口：
```javascript
class Strategy {
  constructor(config, wallet, swapService)
  start()     // 同步返回，内部使用定时器异步执行
  stop(reason = '用户手动停止')
  getStatus() // 返回 { isRunning, stats }
}
```

**关键点**：`start()` 方法必须立即返回（不阻塞），使用 `setInterval` 在后台执行。参考 [BuySellStrategy.js#L37-L64](src/services/strategies/BuySellStrategy.js#L37-L64)。

## 日志系统

使用 [src/utils/logger.js](src/utils/logger.js) 的双轨日志系统：
- **系统日志** `log.info/success/warning/error()` - 组件生命周期、启停事件
- **交易日志** `tradeLog.info/success/warning/error()` - 价格检查、交易执行、失败详情

交易日志自动附加上下文（价格、Gas、滑点），用于 [LogDisplay.jsx](src/components/LogDisplay.jsx) 分类展示。

## 关键工作流

### 启动开发环境
```bash
npm run dev  # Vite 开发服务器，http://localhost:5173
```

### 添加新策略
1. 在 [src/services/strategies/](src/services/strategies/) 创建策略类（继承 Strategy 接口）
2. 更新 [strategies/index.js](src/services/strategies/index.js) 导出
3. 在 [BotCard.jsx](src/components/BotCard.jsx) 添加策略类型映射
4. 在 [BotManager.jsx](src/components/BotManager.jsx) 添加配置表单

### Swap 交易调用
使用 [src/services/swap.js](src/services/swap.js) 的封装方法：
```javascript
import { getXOCPrice, buyXOC, sellXOC } from '../services/swap'

// 获取 WXOC 对 USDT 价格
const price = await getXOCPrice(wallet)

// 买入 WXOC（花费 USDT）
await buyXOC(wallet, usdtAmount, slippage)

// 卖出 WXOC（获得 USDT）
await sellXOC(wallet, xocAmount, slippage)
```

**重要**：所有价格和金额在内部已转换为正确单位（USDT 6位小数，WXOC 18位小数）。

## 常见陷阱

### ❌ 不要阻塞策略启动
```javascript
// 错误：start() 内部使用 async/await 等待首次交易
async start() {
  await this.executeTrade() // 阻塞UI！
}

// 正确：start() 同步返回，交易异步执行
start() {
  this.checkAndTrade().catch(err => tradeLog.error(err))
  this.timer = setInterval(...)
}
```

### ❌ 不要混淆 XOC 和 WXOC
- 钱包余额显示需区分：[WalletBalance.jsx](src/components/WalletBalance.jsx) 同时显示 XOC（Gas）和 WXOC（交易资产）
- Swap 合约只接受 WXOC 地址：`0x4eabbaBeBbb358660cA080e8F2bb09E4a911AB4E`

### ❌ 不要直接操作 localStorage
必须使用 [storage.js](src/utils/storage.js) 的封装方法（`saveToStorage`, `getFromStorage`），确保错误处理和JSON序列化一致。

## 网络配置（硬编码）

所有区块链交互使用 SwapX 测试网：
- RPC: `https://rpc.xone.org/`
- Chain ID: `3721`
- Router: `0x89eA27957bb86FBFFC2e0ABfc5a5a64BB0343367`
- Factory: `0x76bDc5a6190Ea31A6D5C7e93a8a2ff4dD15080A6`
- 代币地址见 [swap.js#L16-L29](src/services/swap.js#L16-L29)

**修改网络配置时**：需同步更新 [swap.js](src/services/swap.js) 和 [wallet.js](src/services/wallet.js) 中的 `NETWORK_CONFIG` 常量。

## UI 组件层次

[App.jsx](src/App.jsx) 使用 Ant Design Layout 管理路由：
- **Dashboard** - 钱包管理、余额、统计
- **BotManager** - 机器人列表和配置
- **ManualTrade** - 单次手动交易
- **LogDisplay** - 双栏日志查看器

状态通过 props 下传（钱包信息），子组件通过回调通知父组件更新（如导入新钱包）。

## 测试策略

使用测试脚本验证底层服务（无需启动UI）：
```bash
node src/test-balance.js  # 测试余额查询
node src/test-swap.js     # 测试单次 Swap
```

**部署前**：确保在测试网充值足够的 XOC（Gas）和 USDT（交易），避免生产环境失败。

## 中文本地化

项目全中文：组件文案、日志消息、错误提示均使用中文。Ant Design 通过 [App.jsx#L91](src/App.jsx#L91) 配置 `zhCN` locale。添加新组件时保持语言一致性。
