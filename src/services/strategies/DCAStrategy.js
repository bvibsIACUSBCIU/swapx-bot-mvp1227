import { tradeLog } from '../../utils/logger'
import { saveTrade } from '../../utils/storage'

/**
 * DCA (Dollar Cost Averaging) 定投策略 - 进阶版
 * 特性：
 * 1. 资金预算控制
 * 2. 价格阈值保护（最高买入价）
 * 3. 灵活的时间周期
 */
export class DCAStrategy {
  constructor(config, wallet, swapService) {
    // config: { amount, interval, totalBudget, maxPrice }
    this.config = config 
    this.wallet = wallet
    this.swapService = swapService
    
    this.isRunning = false
    this.totalSpent = 0     // 已投入总金额
    this.executedTimes = 0  // 已执行次数
    this.timer = null
  }

  /**
   * 启动策略
   */
  start() {
    if (this.isRunning) {
      throw new Error('策略已在运行中')
    }

    // 基础检查
    if (this.totalSpent >= this.config.totalBudget) {
      throw new Error('预算已用尽，无法启动')
    }

    this.isRunning = true
    
    let logMsg = `DCA策略启动: 每${this.formatInterval(this.config.interval)}买入 ${this.config.amount} USDT`
    if (this.config.maxPrice) {
      logMsg += `, 价格上限 ${this.config.maxPrice} USDT`
    }
    logMsg += `, 总预算 ${this.config.totalBudget} USDT`
    
    tradeLog.info(logMsg)

    // 立即尝试执行第一次（异步，不阻塞）
    this.checkAndExecute().catch(err => {
      tradeLog.error(`首次执行失败: ${err.message}`)
    })

    // 设置定时器
    this.timer = setInterval(async () => {
      await this.checkAndExecute()
    }, this.config.interval * 1000)
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
    tradeLog.info(`DCA策略停止: 已执行${this.executedTimes}次, 总投入${this.totalSpent.toFixed(2)}/${this.config.totalBudget} USDT`)
  }

  /**
   * 检查条件并执行交易
   */
  async checkAndExecute() {
    try {
      // 1. 检查预算
      if (this.totalSpent + this.config.amount > this.config.totalBudget) {
        this.stop()
        tradeLog.success(`DCA策略完成: 预算已用尽 (已投 ${this.totalSpent} USDT)`)
        return
      }

      // 2. 检查价格条件（如果有设置）
      if (this.config.maxPrice) {
        const { getXOCPrice } = await import('../swap')
        const currentPrice = await getXOCPrice(this.wallet.provider)
        
        if (currentPrice > this.config.maxPrice) {
          tradeLog.warning(`当前价格 ${currentPrice.toFixed(4)} 高于设定上限 ${this.config.maxPrice}，本次跳过`)
          return
        }
      }

      // 3. 执行交易
      await this.executeTrade()

    } catch (error) {
      tradeLog.error(`DCA检查失败: ${error.message}`)
    }
  }

  /**
   * 执行单次交易
   */
  async executeTrade() {
    try {
      tradeLog.info(`执行第${this.executedTimes + 1}次定投: ${this.config.amount} USDT`)

      const { buyXOC, getWXOCPrice } = await import('../swap')
      const { createProvider } = await import('../wallet')
      
      // 获取当前价格
      const provider = createProvider('xoc')
      const currentPrice = await getWXOCPrice(provider)
      
      const result = await buyXOC(
        this.wallet,
        this.config.amount,
        0.5 // 0.5% 滑点
      )

      this.executedTimes++
      this.totalSpent += this.config.amount

      // 保存交易记录
      saveTrade({
        type: 'BUY',
        source: 'bot',
        botType: 'dca',
        tokenFrom: 'USDT',
        tokenTo: 'WXOC',
        amountIn: this.config.amount,
        amountOut: this.config.amount / currentPrice, // 估算输出
        price: currentPrice,
        txHash: result.hash,
        status: 'success',
        timestamp: new Date().toISOString()
      })

      tradeLog.success(
        `定投买入成功: 花费 ${this.config.amount} USDT\n` +
        `价格: ${currentPrice.toFixed(6)} USDT\n` +
        `进度: ${(this.totalSpent / this.config.totalBudget * 100).toFixed(1)}%\n` +
        `交易哈希: ${result.hash}`
      )

      return result
    } catch (error) {
      tradeLog.error(`买入失败: ${error.message}`)
      throw error // 抛出错误以便上层处理或仅仅记录
    }
  }

  /**
   * 获取策略状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      executedTimes: this.executedTimes,
      totalSpent: this.totalSpent,
      totalBudget: this.config.totalBudget,
      progress: (this.totalSpent / this.config.totalBudget * 100).toFixed(1)
    }
  }

  /**
   * 辅助函数：格式化时间间隔
   */
  formatInterval(seconds) {
    if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)}天`
    if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}小时`
    if (seconds >= 60) return `${(seconds / 60).toFixed(0)}分钟`
    return `${seconds}秒`
  }

  /**
   * 重置策略
   */
  reset() {
    this.stop()
    this.executedTimes = 0
    this.totalSpent = 0
    tradeLog.info('DCA策略已重置')
  }
}