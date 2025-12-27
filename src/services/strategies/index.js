/**
 * 策略统一导出
 * 按优先级排序：低买高卖 > 定投 > 网格
 */

export { BuySellStrategy } from './BuySellStrategy'
export { DCAStrategy } from './DCAStrategy'
export { GridStrategy } from './GridStrategy'

/**
 * 策略元数据
 * 用于UI展示
 */
export const STRATEGIES = [
  {
    value: 'buysell',
    label: '低买高卖',
    icon: 'swap',
    description: '价格低于阈值买入，高于阈值卖出',
    defaultConfig: {
      buyThreshold: 0.082,      // 买入阈值 (USDT)
      sellThreshold: 0.15,      // 卖出阈值 (USDT)
      tradeAmount: 1,           // 每次交易金额 (USDT)
      checkInterval: 30         // 检查间隔 (秒)
    }
  },
  {
    value: 'dca',
    label: '定投策略 (DCA)',
    icon: 'rise',
    description: '定时定额买入，适合长期持有',
    defaultConfig: {
      amount: 100,              // 买入金额 (USDT)
      interval: 3600,           // 执行间隔 (秒)
      totalTimes: 10            // 总次数
    }
  },
  {
    value: 'grid',
    label: '网格策略 (Grid)',
    icon: 'appstore',
    description: '设置价格区间，高抛低吸赚差价',
    defaultConfig: {
      gridCount: 10,            // 网格数量
      lowerPrice: 0.05,         // 价格下限 (USDT)
      upperPrice: 0.20,         // 价格上限 (USDT)
      amountPerGrid: 50         // 单网格金额 (USDT)
    }
  }
]

/**
 * 根据策略类型获取策略类
 */
export function getStrategyClass(strategyType) {
  switch (strategyType) {
    case 'buysell':
      return require('./BuySellStrategy').BuySellStrategy
    case 'dca':
      return require('./DCAStrategy').DCAStrategy
    case 'grid':
      return require('./GridStrategy').GridStrategy
    default:
      throw new Error(`未知的策略类型: ${strategyType}`)
  }
}
