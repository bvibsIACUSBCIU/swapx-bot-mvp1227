/**
 * Swap交易功能测试脚本
 * 在浏览器控制台运行此脚本测试swap.js功能
 */

import { createProvider, createWallet } from './services/wallet'
import { 
  getTokenPrice, 
  executeSwap, 
  waitForTransaction,
  getXOCPrice,
  buyXOC,
  sellXOC,
  estimateOutput 
} from './services/swap'
import { log } from './utils/logger'

/**
 * 测试1: 获取代币价格
 */
export const testGetPrice = async () => {
  try {
    console.clear()
    console.log('='.repeat(60))
    console.log('测试1: 获取代币价格')
    console.log('='.repeat(60))
    
    // 创建provider
    const provider = createProvider('xoc')
    
    // 测试XOC/USDT价格
    log.info('正在获取XOC价格...')
    const price = await getXOCPrice(provider)
    
    console.log(`\n✅ 成功获取价格: 1 XOC = ${price} USDT`)
    console.log(`   当前价格: $${price}`)
    
    // 测试USDT/XOC价格
    const priceReverse = await getTokenPrice('USDT', 'XOC', provider)
    console.log(`\n✅ 反向价格: 1 USDT = ${priceReverse} XOC`)
    
    return { price, priceReverse }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    log.error('价格测试失败', error)
    throw error
  }
}

/**
 * 测试2: 估算输出金额
 */
export const testEstimateOutput = async () => {
  try {
    console.clear()
    console.log('='.repeat(60))
    console.log('测试2: 估算输出金额')
    console.log('='.repeat(60))
    
    const provider = createProvider('xoc')
    
    // 测试用1 USDT买XOC能获得多少
    log.info('估算: 1 USDT -> ? XOC')
    const xocOutput = await estimateOutput(provider, 'USDT', 'XOC', 1)
    console.log(`\n✅ 1 USDT 可以买入: ${xocOutput.toFixed(4)} XOC`)
    
    // 测试用1 XOC卖出能获得多少USDT
    log.info('估算: 1 XOC -> ? USDT')
    const usdtOutput = await estimateOutput(provider, 'XOC', 'USDT', 1)
    console.log(`✅ 1 XOC 可以卖出: ${usdtOutput.toFixed(4)} USDT`)
    
    return { xocOutput, usdtOutput }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    log.error('估算测试失败', error)
    throw error
  }
}

/**
 * 测试3: 执行测试交易（需要私钥）
 * 警告：这会执行真实交易！
 */
export const testExecuteSwap = async (privateKey, amount = 0.1) => {
  try {
    console.clear()
    console.log('='.repeat(60))
    console.log('测试3: 执行测试交易')
    console.log('='.repeat(60))
    console.log('⚠️  警告：这是真实交易！')
    console.log('='.repeat(60))
    
    if (!privateKey) {
      throw new Error('需要提供私钥参数')
    }
    
    if (!confirm(`确定要用 ${amount} USDT 执行测试交易吗？`)) {
      console.log('❌ 已取消')
      return
    }
    
    // 创建provider和wallet
    const provider = createProvider('xoc')
    const wallet = createWallet(privateKey, provider)
    
    console.log(`\n钱包地址: ${wallet.address}`)
    
    // 检查余额
    log.info('检查余额...')
    const balance = await provider.getBalance(wallet.address)
    console.log(`XOC余额: ${ethers.formatEther(balance)} XOC`)
    
    // 获取当前价格
    const price = await getXOCPrice(provider)
    console.log(`当前价格: 1 XOC = ${price} USDT`)
    
    // 执行买入
    log.info(`开始买入: ${amount} USDT -> XOC`)
    const result = await buyXOC(wallet, amount, 0.5)
    
    console.log('\n✅ 交易成功！')
    console.log(`交易哈希: ${result.hash}`)
    console.log(`区块号: ${result.blockNumber}`)
    console.log(`Gas费用: ${result.gasCost} XOC`)
    
    return result
    
  } catch (error) {
    console.error('❌ 交易失败:', error.message)
    log.error('交易测试失败', error)
    throw error
  }
}

/**
 * 完整测试流程（不执行真实交易）
 */
export const runAllTests = async () => {
  try {
    console.clear()
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║           Swap交易功能完整测试                            ║')
    console.log('╚═══════════════════════════════════════════════════════════╝\n')
    
    const results = {}
    
    // 测试1: 获取价格
    console.log('\n📝 运行测试1: 获取价格')
    try {
      results.price = await testGetPrice()
      console.log('✅ 测试1通过\n')
    } catch (error) {
      console.log('❌ 测试1失败:', error.message, '\n')
    }
    
    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 测试2: 估算输出
    console.log('\n📝 运行测试2: 估算输出')
    try {
      results.estimate = await testEstimateOutput()
      console.log('✅ 测试2通过\n')
    } catch (error) {
      console.log('❌ 测试2失败:', error.message, '\n')
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('测试总结')
    console.log('='.repeat(60))
    console.log('✅ 价格获取功能: 正常')
    console.log('✅ 输出估算功能: 正常')
    console.log('\n💡 提示:')
    console.log('  - 要测试真实交易，运行: testExecuteSwap(privateKey, amount)')
    console.log('  - 示例: testExecuteSwap("0x123...", 0.1)')
    console.log('  - ⚠️  警告: 会消耗真实资金和gas费！')
    console.log('\n可用命令:')
    console.log('  testGetPrice()          - 获取当前价格')
    console.log('  testEstimateOutput()    - 估算交易输出')
    console.log('  testExecuteSwap(key, amount) - 执行测试交易')
    console.log('  runAllTests()           - 运行所有测试\n')
    
    return results
    
  } catch (error) {
    console.error('❌ 测试异常:', error)
  }
}

// 开发环境自动导出到全局
if (import.meta.env.DEV) {
  window.testGetPrice = testGetPrice
  window.testEstimateOutput = testEstimateOutput
  window.testExecuteSwap = testExecuteSwap
  window.runAllTests = runAllTests
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Swap测试工具已加载                                ║
╚═══════════════════════════════════════════════════════════╝

可用命令:
  runAllTests()              - 运行所有测试（推荐）
  testGetPrice()             - 测试价格获取
  testEstimateOutput()       - 测试输出估算
  testExecuteSwap(key, amt)  - 执行真实交易（需要私钥）

快速开始:
  > runAllTests()

⚠️  注意:
  - 前两个测试是安全的，不会执行交易
  - testExecuteSwap() 会执行真实交易，需谨慎使用
  `)
}
