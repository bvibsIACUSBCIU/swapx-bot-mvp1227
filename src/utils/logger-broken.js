/**
 * 日志记录工具
 * 支持多级别日志，区分交易日志和运行日志，保存到localStorage
 */

import { saveToStorage, getFromStorage } from './storage'

const LOG_KEY = 'swapx_logs'
const TRADE_LOG_KEY = 'swapx_trade_logs'
const MAX_LOGS = 1000 // 最多保存1000条日志

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEBUG: 'debug'
}

/**
 * 日志类型
 */
export const LOG_TYPES = {
  SYSTEM: 'system',   // 系统运行日志
  TRADE: 'trade'      // 交易日志
}

/**
 * 添加日志（内部方法）
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 * @param {string} type - 日志类型 ('system' | 'trade')
 * @param {boolean} silent - 是否静默（不输出到控制台）
 */
const addLogInternal = (level, message, data = null, type = LOG_TYPES.SYSTEM, silent = false) => {
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level,
    type,
    message,
    data
  }

  // 根据类型选择存储key
  const storageKey = type === LOG_TYPES.TRADE ? TRADE_LOG_KEY : LOG_KEY
  
  // 获取现有日志
  let logs = getFromStorage(storageKey, [])
  
  // 添加新日志
  logs.push(log)
  
  // 限制日志数量
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS)
  }
  
  // 保存到localStorage
  saveToStorage(storageKey, logs)
  
  // 输出到控制台（除非静默）
  if (!silent) {
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'
    const typePrefix = type === LOG_TYPES.TRADE ? '[交易]' : '[系统]'
    console[consoleMethod](`${typePrefix} [${level.toUpperCase()}] ${message}`, data || '')
  }
  
  return log
}

/**
 * 添加日志（兼容旧API）
 */
export const addLog = (level, message, data = null) => {
  return addLogInternal(level, message, data, LOG_TYPES.SYSTEM)
}

/**
 * 获取所有日志
 * @param {string} type - 日志类型 ('system' | 'trade' | 'all')
 */
export const getLogs = (type = 'all') => {
  if (type === LOG_TYPES.TRADE) {
    return getFromStorage(TRADE_LOG_KEY, [])
  } else if (type === LOG_TYPES.SYSTEM) {
    return getFromStorage(LOG_KEY, [])
  } else {
    // 合并所有日志并按时间排序
    const systemLogs = getFromStorage(LOG_KEY, [])
    const tradeLogs = getFromStorage(TRADE_LOG_KEY, [])
    return [...systemLogs, ...tradeLogs].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    )
  }
}

/**
 * 清空日志
 * @param {string} type - 日志类型 ('system' | 'trade' | 'all')
 */
export const clearLogs = (type = 'all') => {
  if (type === LOG_TYPES.TRADE || type === 'all') {
    saveToStorage(TRADE_LOG_KEY, [])
  }
  if (type === LOG_TYPES.SYSTEM || type === 'all') {
    saveToStorage(LOG_KEY, [])
  }
  console.log(`${type === 'all' ? '所有' : type === 'trade' ? '交易' : '系统'}日志已清空`
 * 添加日志（兼容旧API）
 */
export const addLog = (level, message, data = null) => {
  return addLogInternal(level, message, data, LOG_TYPES.SYSTEM)
}

/**
 * 获取所有日志
 */
export const getLogs = () => {
  return getFromStorage(LOG_KEY, [])
}

/**
 * 清空日志
 */
export const clearLogs = () => {
  saveToStorage(LOG_KEY, [])
  console.log('日志已清空')
}

/**
 * 根据级别获取日志
 */
export const getLogsByLevel = (level) => {
  const logs = getLogs()
  return logs.filter(log => log.level === level)
}

/**
 * 根据时间范围获取日志
 */
export const getLogsByTimeRange = (startTime, endTime) => {
  const logs = getLogs()
  return logs.filter(log => {
    const timestamp = new Date(log.timestamp).getTime()
    return timestamp >= startTime && timestamp <= endTime
  })
}

/**
 * 搜索日志
 */
export const searchLogs = (keyword) => {
  const logs = getLogs()
  const lowerKeyword = keyword.toLowerCase()
  return logs.filter(log => 
    log.message.toLowerCase().includes(lowerKeyword) ||
    (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerKeyword))
  )
}

/**
 * 导出日志为文本文件
 */
export const exportLogs = (filename = null) => {
  const logs = getLogs()
  const logText = logs
    .map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN')
      const dataStr = log.data ? `\n  数据: ${JSON.stringify(log.data, null, 2)}` : ''
      return `[${time}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`
    })
    .join('\n\n')
  
  const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `swapx-logs-${Date.now()}.txt`
  a.click()
  
  URL.revokeObjectURL(url)
  addLog('info', '日志已导出')
}

/**
 * 导出日志为JSON文件
 */
export const exportLogsAsJSON = (filename = null) => {
  const logs = getLogs()
  const jsonStr = JSON.stringify(logs, null, 2)
  
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  （系统日志）
 */
export const log = {
  info: (message, data, silent = false) => {
    return addLogInternal(LOG_LEVELS.INFO, message, data, LOG_TYPES.SYSTEM, silent)
  },
  success: (message, data, silent = false) => {
    return addLogInternal(LOG_LEVELS.SUCCESS, message, data, LOG_TYPES.SYSTEM, silent)
  },
  warning: (message, data, silent = false) => {
    return addLogInternal(LOG_LEVELS.WARNING, message, data, LOG_TYPES.SYSTEM, silent)
  },
  error: (message, error, silent = false) => {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error
    return addLogInternal(LOG_LEVELS.ERROR, message, errorData, LOG_TYPES.SYSTEM, silent)
  },
  debug: (message, data, silent = false) => {
    return addLogInternal(LOG_LEVELS.DEBUG, message, data, LOG_TYPES.SYSTEM, silent)
  }
}

/**
 * tradeLog对象 - 专门用于交易日志
 */
export const tradeLog = {
  info: (message, data) => {
    return addLogInternal(LOG_LEVELS.INFO, message, data, LOG_TYPES.TRADE)
  },
  success: (message, data) => {
    return addLogInternal(LOG_LEVELS.SUCCESS, message, data, LOG_TYPES.TRADE)
  },
/**
 * 余额监控辅助类
 * 用于检测余额变化并自动记录日志
 */
export class BalanceMonitor {
  constructor() {
    this.lastBalances = {}
  }

  /**
   * 检查并记录余额变化
   * @param {string} address - 钱包地址
   * @param {Object} balances - 当前余额 { xoc, wxoc, usdt }
   * @returns {boolean} 是否有变化
   */
  checkAndLog(address, balances) {
    const key = address.toLowerCase()
    const lastBalance = this.lastBalances[key]
    
    if (!lastBalance) {
      // 首次记录
      this.lastBalances[key] = { ...balances }
      log.info(`钱包余额初始化`, { address: address.slice(0, 10) + '...', ...balances })
      return true
    }
    
    // 检查是否有变化（保留4位小数比较）
    const hasChange = 
      parseFloat(balances.xoc).toFixed(4) !== parseFloat(lastBalance.xoc).toFixed(4) ||
      parseFloat(balances.wxoc).toFixed(4) !== parseFloat(lastBalance.wxoc).toFixed(4) ||
      parseFloat(balances.usdt).toFixed(2) !== parseFloat(lastBalance.usdt).toFixed(2)
    
    if (hasChange) {
      // 计算变化
      const changes = {
        xoc: (parseFloat(balances.xoc) - parseFloat(lastBalance.xoc)).toFixed(4),
        wxoc: (parseFloat(balances.wxoc) - parseFloat(lastBalance.wxoc)).toFixed(4),
        usdt: (parseFloat(balances.usdt) - parseFloat(lastBalance.usdt)).toFixed(2)
      }
      
      // 只记录有变化的代币
      const changedTokens = []
      if (parseFloat(changes.xoc) !== 0) changedTokens.push(`XOC: ${changes.xoc > 0 ? '+' : ''}${changes.xoc}`)
      if (parseFloat(changes.wxoc) !== 0) changedTokens.push(`WXOC: ${changes.wxoc > 0 ? '+' : ''}${changes.wxoc}`)
      if (parseFloat(changes.usdt) !== 0) changedTokens.push(`USDT: ${changes.usdt > 0 ? '+' : ''}${changes.usdt}`)
      
      if (changedTokens.length > 0) {
        log.success(`余额变化: ${changedTokens.join(', ')}`, { 
          current: balances,
          previous: lastBalance
        })
      }
      
      // 更新缓存
      this.lastBalances[key] = { ...balances }
      return true
    }
    
    return false
  }

  /**
   * 清除缓存
   */
  clear() {
    this.lastBalances = {}
  }
}

export default {
  addLog,
  getLogs,
  clearLogs,
  getLogsByLevel,
  getLogsByTimeRange,
  searchLogs,
  exportLogs,
  exportLogsAsJSON,
  getLogStats,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logDebug,
  log,
  tradeLog,
  BalanceMonitor,
  LOG_LEVELS,
  LOG_TYPEt logDebug = (message, data) => addLog(LOG_LEVELS.DEBUG, message, data)

/**
 * log对象 - 提供简洁的日志API
 */
export const log = {
  info: (message, data) => {
    const result = addLog(LOG_LEVELS.INFO, message, data)
    console.log(`ℹ️ ${message}`, data || '')
    return result
  },
  success: (message, data) => {
    const result = addLog(LOG_LEVELS.SUCCESS, message, data)
    console.log(`✅ ${message}`, data || '')
    return result
  },
  warning: (message, data) => {
    const result = addLog(LOG_LEVELS.WARNING, message, data)
    console.warn(`⚠️ ${message}`, data || '')
    return result
  },
  error: (message, error) => {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error
    const result = addLog(LOG_LEVELS.ERROR, message, errorData)
    console.error(`❌ ${message}`, errorData || '')
    return result
  },
  debug: (message, data) => {
    const result = addLog(LOG_LEVELS.DEBUG, message, data)
    console.debug(`🔍 ${message}`, data || '')
    return result
  }
}

export default {
  addLog,
  getLogs,
  clearLogs,
  getLogsByLevel,
  getLogsByTimeRange,
  searchLogs,
  exportLogs,
  exportLogsAsJSON,
  getLogStats,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logDebug,
  LOG_LEVELS
}
