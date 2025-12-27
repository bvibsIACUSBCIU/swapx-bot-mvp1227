# SwapX Trading Bot MVP

去中心化交易机器人 - 基于 React + Vite + Ant Design + Uniswap V2

## 功能特性

- 🔐 **钱包管理**：导入私钥，连接区块链
- 📊 **策略选择**：支持定投(DCA)和网格(Grid)策略
- ⚙️ **参数配置**：灵活配置策略参数
- 🤖 **自动交易**：自动执行买卖交易
- 📝 **日志记录**：实时查看运行日志
- 💾 **本地存储**：所有数据保存在localStorage

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite 5
- **UI组件**: Ant Design 5
- **区块链**: ethers.js 6
- **交易协议**: Uniswap V2 SDK
- **状态管理**: React Hooks
- **本地存储**: localStorage

## 快速开始

### 1. 安装依赖

```bash
cd swapx-bot-mvp
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

浏览器自动打开 http://localhost:5173

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产版本

```bash
npm run preview
```

## 项目结构

```
swapx-bot-mvp/
├── src/
│   ├── components/           # React组件
│   │   ├── WalletImport.jsx      # 钱包导入
│   │   ├── StrategySelector.jsx  # 策略选择
│   │   ├── StrategyConfig.jsx    # 策略配置
│   │   ├── BotControl.jsx        # 机器人控制
│   │   └── LogDisplay.jsx        # 日志显示
│   ├── services/            # 服务层
│   │   ├── wallet.js            # 钱包服务
│   │   ├── swap.js              # 交易服务
│   │   └── strategies/          # 策略实现
│   │       ├── DCAStrategy.js   # 定投策略
│   │       └── GridStrategy.js  # 网格策略
│   ├── utils/               # 工具函数
│   │   ├── storage.js           # localStorage封装
│   │   └── logger.js            # 日志工具
│   ├── App.jsx              # 主应用
│   ├── main.jsx             # 入口文件
│   └── index.css            # 全局样式
├── package.json
├── vite.config.js           # Vite配置
└── index.html
```

## 使用说明

### 1. 导入钱包
- 点击"钱包管理"
- 输入私钥（以0x开头）
- 点击"导入钱包"

### 2. 选择策略
- 点击"策略设置"
- 选择定投或网格策略
- 配置策略参数

### 3. 启动机器人
- 点击"控制台"
- 点击"启动"按钮
- 机器人开始自动交易

### 4. 查看日志
- 点击"运行日志"
- 查看实时交易日志
- 可导出日志文件

## 策略说明

### 定投策略 (DCA)
- **原理**：定时定额买入，降低成本
- **参数**：
  - 买入金额：每次买入的USDT数量
  - 执行间隔：多久买入一次
  - 总次数：总共买入多少次

### 网格策略 (Grid)
- **原理**：设置价格区间，高抛低吸
- **参数**：
  - 网格数量：划分多少个网格
  - 价格下限：最低价格
  - 价格上限：最高价格
  - 单网格金额：每个网格的交易金额

## 安全提示

⚠️ **重要提醒**：
- 私钥仅保存在本地浏览器，不会上传服务器
- 建议使用测试钱包，不要使用主钱包
- 清除浏览器数据会删除私钥，请提前备份
- 代码开源，使用前请仔细审查

## 配置说明

### RPC节点
在 [src/services/wallet.js](src/services/wallet.js) 中配置：
```javascript
const RPC_CONFIG = {
  xoc: 'https://xoc-rpc.xociety.io',
}
```

### 合约地址
在 [src/services/swap.js](src/services/swap.js) 中配置：
```javascript
const CONTRACTS = {
  ROUTER: '0x...',  // Uniswap V2 Router地址
  FACTORY: '0x...', // Uniswap V2 Factory地址
}

const TOKENS = {
  USDT: { address: '0x...', decimals: 6 },
  XOC: { address: '0x...', decimals: 18 }
}
```

## 开发计划

- [ ] 添加更多策略（马丁格尔、均线策略等）
- [ ] 支持多交易对
- [ ] 添加价格图表
- [ ] 优化交易性能
- [ ] 添加止盈止损
- [ ] 支持移动端

## 许可证

MIT License

## 作者

SwapX Team

---

**免责声明**：本项目仅供学习交流使用，投资有风险，请谨慎使用。
