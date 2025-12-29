import { addLog, tradeLog } from '../../utils/logger'
import { getXOCPrice, buyXOC, sellXOC } from '../swap'
import { saveTrade } from '../../utils/storage'

/**
 * 低买高卖策略
 * 当价格低于买入阈值时买入，高于卖出阈值时卖出
 * 持续交易直到价格不满足条件
 */
export class BuySellStrategy {
  constructor(config, wallet, swapService) {
    this.config = config // { buyThreshold, sellThreshold, tradeAmount, checkInterval }
    this.wallet = wallet
    this.swapService = swapService
    this.isRunning = false
    this.timer = null
    this.startTime = null // 记录启动时间
    this.lastTradeTime = null // 记录最后交易时间
    this.lastPrice = null // 记录最后检查的价格
    this.stats = {
      totalBuyCount: 0,
      totalSellCount: 0,
      totalBuyAmount: 0,
      totalSellAmount: 0,
      totalXOCBought: 0,
      totalXOCSold: 0,
      failedTrades: 0 // 失败交易次数
    }
  }

  /**
   * 启动策略（同步返回，不阻塞）
   */
  start() {
    if (this.isRunning) {
      tradeLog.warning('策略已在运行中')
      return
    }

    this.isRunning = true
    this.startTime = Date.now() // 记录启动时间
    
    tradeLog.success(
      '🤖 低买高卖策略启动\n' +
      `📊 买入阈值: ${this.config.buyThreshold} USDT\n` +
      `📊 卖出阈值: ${this.config.sellThreshold} USDT\n` +
      `💰 交易金额: ${this.config.tradeAmount} USDT\n` +
      `⏱️  检查间隔: ${this.config.checkInterval}秒\n` +
      `🚀 开始时间: ${new Date().toLocaleString('zh-CN')}`
    )

    // 设置定时器 - 持续监控价格并交易
    this.timer = setInterval(async () => {
      try {
        await this.checkAndTrade()
      } catch (error) {
        // 捕获任何未处理的错误，防止定时器停止
        tradeLog.error(`定时检查出错: ${error.message}`)
        this.stats.failedTrades++
      }
    }, this.config.checkInterval * 1000)

    // 立即执行第一次检查（完全异步，不阻塞启动）
    this.checkAndTrade().catch(error => {
      tradeLog.error(`首次检查失败: ${error.message}`)
      this.stats.failedTrades++
    })
    
    tradeLog.info('✅ 策略定时器已启动，开始持续监控...')
  }

  /**
   * 停止策略
   * @param {string} reason - 停止原因
   */
  stop(reason = '用户手动停止') {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isRunning = false
    
    const runningTime = this.getRunningTime()
    const netProfit = this.stats.totalSellAmount - this.stats.totalBuyAmount
    
    tradeLog.info(
      '⛔ 低买高卖策略停止\n' +
      `📝 停止原因: ${reason}\n` +
      `⏱️  运行时长: ${this.formatTime(runningTime)}\n` +
      `📈 买入次数: ${this.stats.totalBuyCount} (${this.stats.totalBuyAmount.toFixed(2)} USDT)\n` +
      `📉 卖出次数: ${this.stats.totalSellCount} (${this.stats.totalSellAmount.toFixed(2)} USDT)\n` +
      `❌ 失败次数: ${this.stats.failedTrades}\n` +
      `💵 净盈亏: ${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} USDT\n` +
      `🏁 结束时间: ${new Date().toLocaleString('zh-CN')}`
    )
  }

  /**
   * 检查价格并执行交易 - 持续交易直到价格不满足条件
   */
  async checkAndTrade() {
    if (!this.isRunning) {
      tradeLog.warning('⚠️ 策略未运行，跳过检查')
      return
    }

    try {
      // 获取当前价格
      const provider = this.wallet.provider
      
      // 获取 XOC/USDT 价格
      const price = await getXOCPrice(provider)
      this.lastPrice = price

      // 判断交易信号并持续执行
      if (price <= this.config.buyThreshold) {
        // 价格低于或等于买入阈值，执行买入
        const discount = ((1 - price / this.config.buyThreshold) * 100).toFixed(2)
        tradeLog.warning(
          '🔔 触发买入信号!\n' +
          `💹 当前价格: ${price.toFixed(6)} USDT\n` +
          `🎯 买入阈值: ${this.config.buyThreshold} USDT\n` +
          `💰 折扣率: ${discount}%\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
        await this.executeBuy(price)
        
      } else if (price >= this.config.sellThreshold) {
        // 价格高于或等于卖出阈值，执行卖出
        const premium = ((price / this.config.sellThreshold - 1) * 100).toFixed(2)
        tradeLog.warning(
          '🔔 触发卖出信号!\n' +
          `💹 当前价格: ${price.toFixed(6)} USDT\n` +
          `🎯 卖出阈值: ${this.config.sellThreshold} USDT\n` +
          `📈 溢价率: ${premium}%\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
        await this.executeSell(price)
        
      } else {
        // 价格在阈值之间，等待交易信号
        // 每10次检查输出一次状态，避免日志过多
        const totalChecks = this.stats.totalBuyCount + this.stats.totalSellCount
        if (totalChecks % 10 === 0) {
          tradeLog.info(
            `⏳ 监控中... 价格: ${price.toFixed(6)} USDT | ` +
            `买入阈值: ${this.config.buyThreshold} | ` +
            `卖出阈值: ${this.config.sellThreshold} | ` +
            `运行: ${this.formatTime(this.getRunningTime())}`
          )
        }
      }
    } catch (error) {
      this.stats.failedTrades++
      tradeLog.error(`❌ 检查价格失败: ${error.message}`)
      // 不停止策略，继续运行
    }
  }

  /**
   * 执行买入
   */
  async executeBuy(price) {
    try {
      tradeLog.info(`🔄 开始执行买入操作: ${this.config.tradeAmount} USDT`)

      const expectedXOC = this.config.tradeAmount / price

      const result = await buyXOC(
        this.wallet,
        this.config.tradeAmount,
        0.5 // 0.5% 滑点
      )

      // 交易成功后的处理

      this.stats.totalBuyCount++
      this.stats.totalBuyAmount += this.config.tradeAmount
      this.stats.totalXOCBought += expectedXOC
      this.lastTradeTime = Date.now()

      const avgBuyPrice = this.stats.totalBuyAmount / this.stats.totalXOCBought

      // 保存交易记录
      saveTrade({
        type: 'BUY',
        tokenFrom: 'USDT',
        tokenTo: 'XOC',
        amountIn: this.config.tradeAmount,
        amountOut: expectedXOC,
        price: price,
        txHash: result.hash,
        status: 'success',
        source: 'bot',
        botType: 'buysell'
      })

      tradeLog.success(
        '✅ 买入成功!\n' +
        `💰 花费: ${this.config.tradeAmount} USDT\n` +
        `🪙 获得: ${expectedXOC.toFixed(6)} XOC\n` +
        `📊 交易价格: ${price.toFixed(6)} USDT\n` +
        `📈 平均买入价: ${avgBuyPrice.toFixed(6)} USDT\n` +
        `🔗 交易哈希: ${result.hash}\n` +
        `📊 累计买入: ${this.stats.totalBuyCount}次 | ${this.stats.totalBuyAmount.toFixed(2)} USDT\n` +
        `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
      )

      return result
    } catch (error) {
      this.stats.failedTrades++
      
      // 检测是否是资金不足
      if (error.message && (error.message.includes('insufficient funds') || 
          error.message.includes('余额不足') ||
          error.message.includes('balance') ||
          error.message.includes('INSUFFICIENT'))) {
        tradeLog.warning(
          '⚠️ 买入失败：资金不足\n' +
          `💰 需要: ${this.config.tradeAmount} USDT\n` +
          `📝 请及时充值，机器人将继续监控价格\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
      } else {
        tradeLog.error(
          `❌ 买入失败: ${error.message}\n` +
          `📊 失败次数: ${this.stats.failedTrades}\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
      }
      
      // 不抛出错误，让策略继续运行
      return null
    }
  }

  /**
   * 执行卖出
   */
  async executeSell(price) {
    try {
      const xocToSell = this.config.tradeAmount / price
      tradeLog.info(`🔄 开始执行卖出操作: ${xocToSell.toFixed(6)} XOC`)

      const expectedUSDT = xocToSell * price

      const result = await sellXOC(
        this.wallet,
        xocToSell,
        0.5 // 0.5% 滑点
      )

      this.stats.totalSellCount++
      this.stats.totalSellAmount += expectedUSDT
      this.stats.totalXOCSold += xocToSell
      this.lastTradeTime = Date.now()

      const avgSellPrice = this.stats.totalSellAmount / this.stats.totalXOCSold
      const netProfit = this.stats.totalSellAmount - this.stats.totalBuyAmount

      // 保存交易记录
      saveTrade({
        type: 'SELL',
        tokenFrom: 'XOC',
        tokenTo: 'USDT',
        amountIn: xocToSell,
        amountOut: expectedUSDT,
        price: price,
        txHash: result.hash,
        status: 'success',
        source: 'bot',
        botType: 'buysell'
      })

      tradeLog.success(
        '✅ 卖出成功!\n' +
        `🪙 卖出: ${xocToSell.toFixed(6)} XOC\n` +
        `💰 获得: ${expectedUSDT.toFixed(2)} USDT\n` +
        `📊 交易价格: ${price.toFixed(6)} USDT\n` +
        `📉 平均卖出价: ${avgSellPrice.toFixed(6)} USDT\n` +
        `🔗 交易哈希: ${result.hash}\n` +
        `📊 累计卖出: ${this.stats.totalSellCount}次 | ${this.stats.totalSellAmount.toFixed(2)} USDT\n` +
        `💵 净盈亏: ${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} USDT\n` +
        `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
      )

      return result
    } catch (error) {
      this.stats.failedTrades++
      
      // 检测是否是余额不足
      if (error.message && (error.message.includes('insufficient funds') || 
          error.message.includes('余额不足') ||
          error.message.includes('balance') ||
          error.message.includes('INSUFFICIENT'))) {
        tradeLog.warning(
          '⚠️ 卖出失败：XOC余额不足\n' +
          `🪙 需要: ${(this.config.tradeAmount / this.lastPrice).toFixed(6)} XOC\n` +
          `📝 请检查余额，机器人将继续监控价格\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
      } else {
        tradeLog.error(
          `❌ 卖出失败: ${error.message}\n` +
          `📊 失败次数: ${this.stats.failedTrades}\n` +
          `⏱️  运行时长: ${this.formatTime(this.getRunningTime())}`
        )
      }
      
      // 不抛出错误，让策略继续运行
      return null
    }
  }

  /**
   * 获取运行时长（秒）
   */
  getRunningTime() {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  /**
   * 格式化时间显示
   */
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}小时 ${m}分钟 ${s}秒`
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const netXOC = this.stats.totalXOCBought - this.stats.totalXOCSold
    const netUSDT = this.stats.totalSellAmount - this.stats.totalBuyAmount
    const avgBuyPrice = this.stats.totalXOCBought > 0 ? this.stats.totalBuyAmount / this.stats.totalXOCBought : 0
    const avgSellPrice = this.stats.totalXOCSold > 0 ? this.stats.totalSellAmount / this.stats.totalXOCSold : 0
    const totalTrades = this.stats.totalBuyCount + this.stats.totalSellCount
    const successRate = totalTrades > 0 ? ((totalTrades - this.stats.failedTrades) / totalTrades * 100).toFixed(2) : 0
    
    return {
      ...this.stats,
      netXOC,
      netUSDT,
      profit: netUSDT,
      avgBuyPrice,
      avgSellPrice,
      totalTrades,
      successRate,
      runningTime: this.getRunningTime(),
      lastPrice: this.lastPrice,
      lastTradeTime: this.lastTradeTime
    }
  }
}
