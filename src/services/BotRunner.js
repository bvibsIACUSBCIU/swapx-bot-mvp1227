/**
 * BotRunner - 全局机器人运行管理器
 * 独立于React组件生命周期，确保机器人持续运行
 */

import { log } from '../utils/logger'

class BotRunner {
  constructor() {
    this.strategies = new Map() // 策略实例
    this.timers = new Map() // 统计定时器
  }

  /**
   * 注册策略实例
   */
  registerStrategy(botId, strategy) {
    this.strategies.set(botId, strategy)
    log.info('策略已注册', { botId })
  }

  /**
   * 获取策略实例
   */
  getStrategy(botId) {
    return this.strategies.get(botId)
  }

  /**
   * 启动策略
   */
  startStrategy(botId) {
    const strategy = this.strategies.get(botId)
    if (strategy) {
      strategy.start()
      log.info('策略已启动', { botId })
      return true
    }
    return false
  }

  /**
   * 停止策略
   */
  stopStrategy(botId, reason = '用户手动停止') {
    const strategy = this.strategies.get(botId)
    if (strategy && strategy.stop) {
      strategy.stop(reason)
      log.info('策略已停止', { botId, reason })
    }
    this.strategies.delete(botId)
    
    // 清理定时器
    const timer = this.timers.get(botId)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(botId)
    }
  }

  /**
   * 注册统计定时器
   */
  registerTimer(botId, timer) {
    this.timers.set(botId, timer)
  }

  /**
   * 获取所有运行中的策略
   */
  getRunningStrategies() {
    const running = []
    this.strategies.forEach((strategy, botId) => {
      if (strategy.isRunning) {
        running.push({ botId, strategy })
      }
    })
    return running
  }

  /**
   * 检查策略是否在运行
   */
  isStrategyRunning(botId) {
    const strategy = this.strategies.get(botId)
    return strategy && strategy.isRunning && strategy.timer
  }

  /**
   * 清理所有策略（仅在应用完全退出时调用）
   */
  cleanupAll(reason = '应用退出') {
    log.warning('清理所有策略', { reason, count: this.strategies.size })
    this.strategies.forEach((strategy, botId) => {
      if (strategy && strategy.stop) {
        strategy.stop(reason)
      }
    })
    this.strategies.clear()
    
    this.timers.forEach(timer => clearInterval(timer))
    this.timers.clear()
  }
}

// 创建全局单例
const botRunner = new BotRunner()

// 只在浏览器真正关闭时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    botRunner.cleanupAll('浏览器关闭')
  })
}

export default botRunner
