import { addLog } from '../../utils/logger'

/**
 * Grid 网格策略
 * 在价格区间内设置多个网格，高抛低吸赚差价
 */
export class GridStrategy {
  constructor(config, wallet, swapService) {
    this.config = config // { gridCount, lowerPrice, upperPrice, amountPerGrid }
    this.wallet = wallet
    this.swapService = swapService
    this.isRunning = false
    this.grids = []
    this.currentPrice = 0
    this.timer = null
  }

  /**
   * 初始化网格
   */
  initializeGrids() {
    const { gridCount, lowerPrice, upperPrice, amountPerGrid } = this.config
    const priceStep = (upperPrice - lowerPrice) / gridCount

    this.grids = []
    for (let i = 0; i <= gridCount; i++) {
      const price = lowerPrice + priceStep * i
      this.grids.push({
        price: price,
        status: 'pending', // pending, bought, sold
        amount: amountPerGrid,
        buyTxHash: null,
        sellTxHash: null
      })
    }

    addLog('info', `网格初始化完成: ${gridCount + 1}个网格, 价格区间${lowerPrice}-${upperPrice}`)
  }

  /**
   * 启动策略
   */
  async start() {
    if (this.isRunning) {
      throw new Error('策略已在运行中')
    }

    this.isRunning = true
    this.initializeGrids()
    
    addLog('info', `网格策略启动: ${this.config.gridCount}个网格`)

    // 定时检查价格并执行交易
    this.timer = setInterval(async () => {
      await this.checkAndTrade()
    }, 10000) // 每10秒检查一次

    // 立即执行一次
    await this.checkAndTrade()
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
    addLog('info', '网格策略停止')
  }

  /**
   * 检查价格并执行交易
   */
  async checkAndTrade() {
    try {
      // 获取当前价格
      const { getXOCPrice } = await import('../swap')
      this.currentPrice = await getXOCPrice(this.wallet.provider)
      
      addLog('info', `当前价格: ${this.currentPrice.toFixed(4)} USDT`)

      // 遍历所有网格，检查是否需要交易
      for (let i = 0; i < this.grids.length; i++) {
        const grid = this.grids[i]
        
        // 买入逻辑：价格跌破网格价且未买入
        if (this.currentPrice <= grid.price && grid.status === 'pending') {
          await this.executeBuy(i)
        }
        
        // 卖出逻辑：价格涨过上一个网格价且已买入
        if (i > 0 && this.currentPrice >= this.grids[i].price && this.grids[i - 1].status === 'bought') {
          await this.executeSell(i - 1)
        }
      }
    } catch (error) {
      addLog('error', `网格检查失败: ${error.message}`)
    }
  }

  /**
   * 执行买入
   */
  async executeBuy(gridIndex) {
    const grid = this.grids[gridIndex]
    
    try {
      addLog('info', `网格${gridIndex}: 买入 ${grid.amount} USDT at ${grid.price}`)

      const { buyXOC } = await import('../swap')
      const result = await buyXOC(this.wallet, grid.amount, 0.5)

      grid.status = 'bought'
      grid.buyTxHash = result.hash

      addLog('success', 
        `网格${gridIndex}买入成功: 花费 ${grid.amount} USDT, 获得 XOC\n` +
        `交易哈希: ${result.hash}`
      )
    } catch (error) {
      addLog('error', `网格${gridIndex}买入失败: ${error.message}`)
    }
  }

  /**
   * 执行卖出
   */
  async executeSell(gridIndex) {
    const grid = this.grids[gridIndex]
    
    try {
      // 计算需要卖出的XOC数量（基于买入时获得的数量）
      const xocAmount = grid.amount / grid.price // 简化计算

      addLog('info', `网格${gridIndex}: 卖出 ${xocAmount.toFixed(4)} XOC`)

      const { sellXOC } = await import('../swap')
      const result = await sellXOC(this.wallet, xocAmount, 0.5)

      grid.status = 'sold'
      grid.sellTxHash = result.hash

      addLog('success', 
        `网格${gridIndex}卖出成功: 卖出 ${xocAmount.toFixed(4)} XOC\n` +
        `交易哈希: ${result.hash}`
      )

      // 重置网格状态，可以再次买入
      setTimeout(() => {
        grid.status = 'pending'
        grid.buyTxHash = null
        grid.sellTxHash = null
      }, 1000)
    } catch (error) {
      addLog('error', `网格${gridIndex}卖出失败: ${error.message}`)
    }
  }

  /**
   * 获取策略状态
   */
  getStatus() {
    const totalGrids = this.grids.length
    const boughtGrids = this.grids.filter(g => g.status === 'bought').length
    const soldGrids = this.grids.filter(g => g.status === 'sold').length

    return {
      isRunning: this.isRunning,
      currentPrice: this.currentPrice,
      totalGrids,
      boughtGrids,
      soldGrids,
      grids: this.grids
    }
  }

  /**
   * 重置策略
   */
  reset() {
    this.stop()
    this.grids = []
    this.currentPrice = 0
    addLog('info', '网格策略已重置')
  }
}
