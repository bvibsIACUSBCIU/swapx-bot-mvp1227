/**
 * localStorage测试脚本
 * 在浏览器控制台运行此脚本测试storage和logger功能
 */

import { 
  saveWallet, 
  getWallet, 
  saveStrategy, 
  getStrategy,
  getStrategies,
  addLog,
  getLogs,
  clearAllStorage 
} from './utils/storage'

import { log } from './utils/logger'

// 测试函数
export const testStorage = () => {
  console.clear()
  console.log('='.repeat(60))
  console.log('开始测试 localStorage 功能')
  console.log('='.repeat(60))
  
  // 测试1: 钱包存储
  console.log('\n📝 测试1: 钱包存储')
  const testWallet = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    privateKey: '0x' + '1'.repeat(64),
    importedAt: new Date().toISOString()
  }
  saveWallet(testWallet)
  const savedWallet = getWallet()
  console.log('保存的钱包:', savedWallet)
  console.assert(savedWallet.address === testWallet.address, '✅ 钱包地址匹配')
  
  // 测试2: 策略存储
  console.log('\n📝 测试2: 策略存储')
  const testStrategy = {
    type: 'dca',
    amount: 100,
    interval: 60,
    totalTimes: 10
  }
  saveStrategy(testStrategy)
  const savedStrategy = getStrategy()
  console.log('保存的策略:', savedStrategy)
  console.assert(savedStrategy.type === 'dca', '✅ 策略类型匹配')
  
  // 测试3: 日志记录
  console.log('\n📝 测试3: 日志记录')
  log.info('这是一条信息日志', { test: true })
  log.success('这是一条成功日志', { value: 123 })
  log.warning('这是一条警告日志')
  log.error('这是一条错误日志', new Error('测试错误'))
  
  const logs = getLogs(10)
  console.log(`获取到 ${logs.length} 条日志:`, logs)
  console.assert(logs.length >= 4, '✅ 日志记录成功')
  
  // 测试4: localStorage查看
  console.log('\n📝 测试4: localStorage内容')
  console.log('localStorage keys:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith('swapx_')) {
      const value = localStorage.getItem(key)
      console.log(`  ${key}: ${value.substring(0, 100)}...`)
    }
  }
  
  // 测试5: 数据大小
  console.log('\n📝 测试5: 数据大小')
  let totalSize = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith('swapx_')) {
      const size = new Blob([localStorage.getItem(key)]).size
      totalSize += size
      console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`)
    }
  }
  console.log(`  总计: ${(totalSize / 1024).toFixed(2)} KB`)
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ 所有测试完成！')
  console.log('='.repeat(60))
  console.log('\n💡 提示:')
  console.log('  - 打开浏览器 DevTools > Application > Local Storage')
  console.log('  - 查看 http://localhost:5173 下的数据')
  console.log('  - 所有key都以 swapx_ 开头')
  console.log('\n💡 清空数据: testClearAll()')
}

// 清空所有数据
export const testClearAll = () => {
  if (confirm('确定要清空所有localStorage数据吗？')) {
    clearAllStorage()
    console.log('✅ 已清空所有数据')
  }
}

// 查看当前localStorage
export const viewStorage = () => {
  console.clear()
  console.log('📦 当前 localStorage 数据:\n')
  
  const data = {
    wallet: getWallet(),
    strategy: getStrategy(),
    strategies: getStrategies(),
    logs: getLogs(10), // 最近10条
  }
  
  console.table(data)
  
  // 详细输出
  console.log('\n详细信息:')
  console.log('Wallet:', data.wallet)
  console.log('Strategy:', data.strategy)
  console.log('Recent Logs:', data.logs)
  
  return data
}

// 导出到全局（仅开发环境）
if (import.meta.env.DEV) {
  window.testStorage = testStorage
  window.testClearAll = testClearAll
  window.viewStorage = viewStorage
  window.log = log
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Storage & Logger 测试工具已加载                  ║
╚═══════════════════════════════════════════════════════════╝

可用命令:
  testStorage()   - 运行完整测试
  viewStorage()   - 查看当前数据
  testClearAll()  - 清空所有数据
  log.info()      - 记录信息日志
  log.success()   - 记录成功日志
  log.warning()   - 记录警告日志
  log.error()     - 记录错误日志

示例:
  > testStorage()
  > viewStorage()
  > log.info('测试消息', { key: 'value' })
  `)
}
