/**
 * localStorage封装工具
 * 统一管理本地存储的数据
 */

const STORAGE_KEYS = {
  WALLET: 'swapx_wallet',
  STRATEGY: 'swapx_strategy',
  LOGS: 'swapx_logs',
  TRADES: 'swapx_trades',
  CONFIG: 'swapx_config'
}

/**
 * 保存数据到localStorage
 */
export const saveToStorage = (key, data) => {
  try {
    const jsonData = JSON.stringify(data)
    localStorage.setItem(key, jsonData)
    return true
  } catch (error) {
    console.error(`保存数据失败: ${error.message}`)
    return false
  }
}

/**
 * 从localStorage读取数据
 */
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const jsonData = localStorage.getItem(key)
    return jsonData ? JSON.parse(jsonData) : defaultValue
  } catch (error) {
    console.error(`读取数据失败: ${error.message}`)
    return defaultValue
  }
}

/**
 * 删除localStorage中的数据
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`删除数据失败: ${error.message}`)
    return false
  }
}

/**
 * 清空所有应用数据
 */
export const clearAllStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    return true
  } catch (error) {
    console.error(`清空数据失败: ${error.message}`)
    return false
  }
}

// ==================== 钱包相关 ====================

/**
 * 保存钱包信息
 */
export const saveWallet = (walletData) => {
  return saveToStorage(STORAGE_KEYS.WALLET, walletData)
}

/**
 * 获取钱包信息
 */
export const getWallet = () => {
  return getFromStorage(STORAGE_KEYS.WALLET)
}

/**
 * 删除钱包信息
 */
export const removeWallet = () => {
  return removeFromStorage(STORAGE_KEYS.WALLET)
}

// ==================== 机器人相关 ====================

/**
 * 保存机器人列表
 */
export const saveBots = (bots) => {
  return saveToStorage('swapx_bots', bots)
}

/**
 * 获取机器人列表
 */
export const getBots = () => {
  return getFromStorage('swapx_bots', [])
}

/**
 * 保存单个机器人
 */
export const saveBot = (bot) => {
  const bots = getBots()
  const index = bots.findIndex(b => b.id === bot.id)
  if (index >= 0) {
    bots[index] = bot
  } else {
    bots.push(bot)
  }
  return saveBots(bots)
}

/**
 * 删除机器人
 */
export const removeBot = (botId) => {
  const bots = getBots()
  const filtered = bots.filter(b => b.id !== botId)
  return saveBots(filtered)
}

// ==================== 策略相关 ====================

/**
 * 保存策略配置
 */
export const saveStrategy = (strategyData) => {
  return saveToStorage(STORAGE_KEYS.STRATEGY, strategyData)
}

/**
 * 获取策略配置
 */
export const getStrategy = () => {
  return getFromStorage(STORAGE_KEYS.STRATEGY)
}

/**
 * 获取所有策略列表（支持多策略）
 */
export const getStrategies = () => {
  return getFromStorage(STORAGE_KEYS.STRATEGY, [])
}

// ==================== 日志相关 ====================

/**
 * 添加日志（供logger使用）
 */
export const addLog = (level, message, data = null) => {
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  }
  
  const logs = getFromStorage(STORAGE_KEYS.LOGS, [])
  logs.push(log)
  
  // 限制日志数量（最多1000条）
  if (logs.length > 1000) {
    logs.shift()
  }
  
  saveToStorage(STORAGE_KEYS.LOGS, logs)
  return log
}

/**
 * 获取日志
 */
export const getLogs = (limit = null) => {
  const logs = getFromStorage(STORAGE_KEYS.LOGS, [])
  if (limit && limit > 0) {
    return logs.slice(-limit)
  }
  return logs
}

// ==================== 交易记录相关 ====================

/**
 * 保存交易记录
 */
export const saveTrade = (tradeData) => {
  const trades = getTrades()
  trades.push({
    ...tradeData,
    timestamp: new Date().toISOString(),
    id: Date.now()
  })
  return saveToStorage(STORAGE_KEYS.TRADES, trades)
}

/**
 * 获取所有交易记录
 */
export const getTrades = () => {
  return getFromStorage(STORAGE_KEYS.TRADES, [])
}

/**
 * 清空交易记录
 */
export const clearTrades = () => {
  return saveToStorage(STORAGE_KEYS.TRADES, [])
}

/**
 * 导出交易记录为JSON
 */
export const exportTrades = () => {
  const trades = getTrades()
  const dataStr = JSON.stringify(trades, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `swapx-trades-${Date.now()}.json`
  a.click()
  
  URL.revokeObjectURL(url)
}

// ==================== 配置相关 ====================

/**
 * 保存应用配置
 */
export const saveConfig = (config) => {
  return saveToStorage(STORAGE_KEYS.CONFIG, config)
}

/**
 * 获取应用配置
 */
export const getConfig = () => {
  return getFromStorage(STORAGE_KEYS.CONFIG, {
    theme: 'light',
    language: 'zh-CN',
    notifications: true
  })
}

/**
 * 获取存储空间使用情况
 */
export const getStorageInfo = () => {
  let totalSize = 0
  const info = {}
  
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const data = localStorage.getItem(key)
    const size = data ? new Blob([data]).size : 0
    info[name] = {
      key,
      size,
      sizeKB: (size / 1024).toFixed(2)
    }
    totalSize += size
  })
  
  return {
    items: info,
    totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
  }
}

export default {
  saveToStorage,
  getFromStorage,
  removeFromStorage,
  clearAllStorage,
  saveWallet,
  getWallet,
  removeWallet,
  saveStrategy,
  getStrategy,
  saveTrade,
  getTrades,
  clearTrades,
  exportTrades,
  saveConfig,
  getConfig,
  getStorageInfo
}
