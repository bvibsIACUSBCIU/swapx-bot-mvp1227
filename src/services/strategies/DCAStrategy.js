import { addLog } from '../../utils/logger'

/**
 * DCA (Dollar Cost Averaging) 定投策略
 * 定时定额买入，适合长期持有
 */
export class DCAStrategy {
  constructor(config, wallet, swapService) {
    this.config = config // { amount, interval, totalTimes }
    this.wallet = wallet
    this.swapService = swapService
    this.isRunning = false
    this.executedTimes = 0
    this.timer = null
  }

  /**
   * 启动策略
   */
  async start() {
    if (this.isRunning) {
      throw new Error('策略已在运行中')
    }

    this.isRunning = true
    addLog('info', `DCA策略启动: 每${this.config.interval}秒买入${this.config.amount} USDT`)

    // 立即执行第一次
    await this.executeTrade()

    // 设置定时器
    this.timer = setInterval(async () => {
      if (this.executedTimes >= this.config.totalTimes) {
        this.stop()
        addLog('success', `DCA策略完成: 共执行${this.executedTimes}次`)
        return
      }
      await this.executeTrade()
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
    addLog('info', `DCA策略停止: 已执行${this.executedTimes}/${this.config.totalTimes}次`)
  }

  /**
   * 执行单次交易
   */
  async executeTrade() {
    try {
      addLog('info', `执行第${this.executedTimes + 1}次买入: ${this.config.amount} USDT`)

      // 使用 buyXOC 方法
      const { buyXOC } = await import('../swap')
      
      const result = await buyXOC(
        this.wallet,
        this.config.amount,
        0.5 // 0.5% 滑点
      )

      this.executedTimes++

      addLog('success', 
        `买入成功: 花费 ${this.config.amount} USDT, 获得 XOC\n` +
        `交易哈希: ${result.hash}`
      )

      return result
    } catch (error) {
      addLog('error', `买入失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取策略状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      executedTimes: this.executedTimes,
      totalTimes: this.config.totalTimes,
      progress: (this.executedTimes / this.config.totalTimes * 100).toFixed(1)
    }
  }

  /**
   * 重置策略
   */
  reset() {
    this.stop()
    this.executedTimes = 0
    addLog('info', 'DCA策略已重置')
  }
}
