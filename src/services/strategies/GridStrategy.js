import { tradeLog } from '../../utils/logger'
import { saveTrade } from '../../utils/storage'

/**
 * Grid 网格策略 - 进阶版
 * 特性：
 * 1. 支持等差/等比网格
 * 2. 自动根据总资金计算单格金额
 * 3. 动态状态追踪
 */
export class GridStrategy {
  constructor(config, wallet, swapService) {
    // config: { gridType, totalInvestment, gridCount, lowerPrice, upperPrice }
    this.config = config
    this.wallet = wallet
    this.swapService = swapService
    
    this.isRunning = false
    this.grids = []
    this.currentPrice = 0
    this.timer = null
    
    // 计算单格资金 (预留少量作为手续费缓冲，实际交易金额略小于计算值)
    this.amountPerGrid = 0
  }

  /**
   * 初始化网格
   */
  initializeGrids() {
    const { gridType, gridCount, lowerPrice, upperPrice, totalInvestment } = this.config
    
    // 简单的资金分配：总资金 / (网格数 + 1) 或者 总资金 / 网格数
    // 这里采用保守策略，假设所有网格都成交所需的资金
    this.amountPerGrid = parseFloat((totalInvestment / gridCount).toFixed(2))

    if (this.amountPerGrid < 1) {
        throw new Error(`单格金额过小 (${this.amountPerGrid} USDT)，请增加总投入或减少网格数`)
    }

    this.grids = []
    
    if (gridType === 'geometric') {
      // 等比网格：价格按固定比例递增
      const ratio = Math.pow(upperPrice / lowerPrice, 1 / gridCount)
      for (let i = 0; i <= gridCount; i++) {
        const price = lowerPrice * Math.pow(ratio, i)
        this.pushGrid(price)
      }
    } else {
      // 等差网格 (默认)：价格按固定数值递增
      const priceStep = (upperPrice - lowerPrice) / gridCount
      for (let i = 0; i <= gridCount; i++) {
        const price = lowerPrice + priceStep * i
        this.pushGrid(price)
      }
    }

    tradeLog.info(
      `网格初始化完成 (${gridType === 'geometric' ? '等比' : '等差'}): \n` +
      `${gridCount + 1}个价格点, 区间 ${lowerPrice}-${upperPrice}\n` +
      `单格计划金额: ${this.amountPerGrid} USDT`
    )
  }

  pushGrid(price) {
    this.grids.push({
      price: price,
      status: 'pending', // pending, bought, sold
      amount: this.amountPerGrid,
      buyTxHash: null,
      sellTxHash: null
    })
  }

  /**
   * 启动策略
   */
  start() {
    if (this.isRunning) {
      throw new Error('策略已在运行中')
    }

    try {
        this.initializeGrids()
        this.isRunning = true
        tradeLog.info('网格策略已启动，开始监控价格...')

        // 立即执行一次（异步，不阻塞）
        this.checkAndTrade().catch(err => {
          tradeLog.error(`首次检查失败: ${err.message}`)
        })

        // 定时检查
        this.timer = setInterval(async () => {
          await this.checkAndTrade()
        }, 10000) // 10秒轮询
    } catch (e) {
        this.isRunning = false
        tradeLog.error(`启动失败: ${e.message}`)
        throw e
    }
  }

  /**
   * 停止策略
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isRunning = false
    tradeLog.info('网格策略停止')
  }

  /**
   * 检查价格并执行交易
   */
  async checkAndTrade() {
    try {
      const { getWXOCPrice } = await import('../swap')
      const { createProvider } = await import('../wallet')
      const provider = createProvider('xoc')
      this.currentPrice = await getWXOCPrice(provider)
      
      // 仅在价格显著变化时打印，或者低频打印，这里简化为每次debug打印
      // addLog('debug', `当前价格: ${this.currentPrice.toFixed(4)} USDT`)

      for (let i = 0; i < this.grids.length; i++) {
        const grid = this.grids[i]
        
        // 买入逻辑：价格跌破网格价 且 状态为空闲(pending)
        if (this.currentPrice <= grid.price && grid.status === 'pending') {
          await this.executeBuy(i)
        }
        
        // 卖出逻辑：价格涨过 *上一层* 网格价 且 *上一层* 状态为已买入
        // 注意：这里是一个简化的网格逻辑，通常是当前格买入，价格回到上一格卖出
        if (i > 0) {
            const prevGrid = this.grids[i - 1] // 低价位的网格
            // 如果当前价格 > 当前网格价格，且低价位的网格已经买入，则卖出低价位的网格获利
            if (this.currentPrice >= grid.price && prevGrid.status === 'bought') {
                await this.executeSell(i - 1)
            }
        }
      }
    } catch (error) {
      tradeLog.error(`网格检查异常: ${error.message}`)
    }
  }

  /**
   * 执行买入
   */
  async executeBuy(gridIndex) {
    const grid = this.grids[gridIndex]
    
    try {
      tradeLog.info(`触发买入: 价格 ${grid.price.toFixed(4)}, 数量 ${grid.amount}`)

      const { buyXOC } = await import('../swap')
      // 实际开发中可能需要检查余额
      const result = await buyXOC(this.wallet, grid.amount, 0.5)

      grid.status = 'bought'
      grid.buyTxHash = result.hash

      // 保存交易记录
      saveTrade({
        type: 'BUY',
        source: 'bot',
        botType: 'grid',
        tokenFrom: 'USDT',
        tokenTo: 'WXOC',
        amountIn: grid.amount,
        amountOut: grid.amount / grid.price, // 估算输出
        price: grid.price,
        txHash: result.hash,
        status: 'success',
        timestamp: new Date().toISOString()
      })

      tradeLog.success(`网格[${gridIndex}]买入成功: ${grid.amount} USDT @ ${grid.price.toFixed(6)}`)
    } catch (error) {
      // 避免频繁报错，可以设置重试冷却
      tradeLog.error(`网格[${gridIndex}]买入失败: ${error.message}`)
    }
  }

  /**
   * 执行卖出
   */
  async executeSell(gridIndex) {
    const grid = this.grids[gridIndex] // 这是之前买入的那个低价格网格
    
    try {
      // 估算持有的XOC数量 = 投入USDT / 买入价格
      // 实际项目中建议查询链上余额或在买入时记录获得的精确Token数量
      const xocAmount = grid.amount / grid.price 

      tradeLog.info(`触发卖出: 网格[${gridIndex}], 数量 ${xocAmount.toFixed(4)} XOC`)

      const { sellXOC } = await import('../swap')
      const result = await sellXOC(this.wallet, xocAmount, 0.5)

      grid.status = 'sold'
      grid.sellTxHash = result.hash

      // 保存交易记录
      saveTrade({
        type: 'SELL',
        source: 'bot',
        botType: 'grid',
        tokenFrom: 'WXOC',
        tokenTo: 'USDT',
        amountIn: xocAmount,
        amountOut: xocAmount * grid.price, // 估算输出
        price: grid.price,
        txHash: result.hash,
        status: 'success',
        timestamp: new Date().toISOString()
      })

      tradeLog.success(`网格[${gridIndex}]卖出成功: ${xocAmount.toFixed(4)} WXOC @ ${grid.price.toFixed(6)}`)

      // 卖出后，该网格重置为 pending，等待下次下跌再次买入
      // 增加延时防止网络延迟导致的状态跳变
      setTimeout(() => {
        grid.status = 'pending'
        grid.buyTxHash = null
        grid.sellTxHash = null
        tradeLog.info(`网格[${gridIndex}]状态重置，等待下次机会`)
      }, 2000)
    } catch (error) {
      tradeLog.error(`网格[${gridIndex}]卖出失败: ${error.message}`)
    }
  }

  /**
   * 获取策略状态
   */
  getStatus() {
    const totalGrids = this.grids.length
    const boughtGrids = this.grids.filter(g => g.status === 'bought').length
    
    // 简单的浮动盈亏计算 (仅供参考)
    let floatProfit = 0
    this.grids.forEach(g => {
        if (g.status === 'bought') {
            // (当前价 - 买入价) * (投入金额 / 买入价)
            floatProfit += (this.currentPrice - g.price) * (g.amount / g.price)
        }
    })

    return {
      isRunning: this.isRunning,
      currentPrice: this.currentPrice,
      totalGrids,
      boughtGrids,
      floatProfit: floatProfit.toFixed(2),
      grids: this.grids
    }
  }

  reset() {
    this.stop()
    this.grids = []
    this.currentPrice = 0
    tradeLog.info('网格策略已重置')
  }
}