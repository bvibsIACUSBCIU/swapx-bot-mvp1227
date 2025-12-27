/**
 * 钱包余额测试脚本
 * 在浏览器控制台运行此脚本测试余额读取功能
 */

import { createProvider, createWallet, getTokenBalance } from './services/wallet'
import { log } from './utils/logger'

/**
 * 代币地址配置
 */
const TOKENS = {
  USDT: '0xb575796D293f37F112f3694b8ff48D711FE67EC7',
  WXOC: '0x4eabbaBeBbb358660cA080e8F2bb09E4a911AB4E'  // 实际交易使用WXOC
}

/**
 * 测试钱包余额读取
 */
export const testWalletBalance = async (privateKey) => {
  try {
    console.clear()
    console.log('='.repeat(60))
    console.log('测试: 钱包余额读取')
    console.log('='.repeat(60))
    
    if (!privateKey) {
      throw new Error('请提供私钥参数')
    }
    
    log.info('创建钱包实例...')
    
    // 创建Provider和Wallet实例
    const provider = createProvider('xoc')
    const wallet = createWallet(privateKey, provider)
    
    console.log(`\n钱包地址: ${wallet.address}`)
    console.log('='.repeat(60))
    
    // 获取XOC余额（原生代币，用于GAS费）
    log.info('正在获取XOC余额（GAS费）...')
    const xocBalance = await provider.getBalance(wallet.address)
    const xocFormatted = (parseFloat(xocBalance.toString()) / 1e18).toFixed(4)
    console.log(`✅ XOC余额（GAS费）: ${xocFormatted} XOC`)
    
    // 获取WXOC余额（用于交易）
    log.info('正在获取WXOC余额（交易代币）...')
    const wxocBalance = await getTokenBalance(wallet, TOKENS.WXOC)
    const wxocFormatted = parseFloat(wxocBalance).toFixed(4)
    console.log(`✅ WXOC余额（交易）: ${wxocFormatted} WXOC`)
    
    // 获取USDT余额
    log.info('正在获取USDT余额...')
    const usdtBalance = await getTokenBalance(wallet, TOKENS.USDT)
    const usdtFormatted = parseFloat(usdtBalance).toFixed(2)
    console.log(`✅ USDT余额: ${usdtFormatted} USDT`)
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 余额汇总')
    console.log('='.repeat(60))
    console.log(`XOC (GAS费):  ${xocFormatted}`)
    console.log(`WXOC (交易):  ${wxocFormatted}`)
    console.log(`USDT:         ${usdtFormatted}`)
    
    return {
      address: wallet.address,
      balances: {
        xoc: xocFormatted,
        wxoc: wxocFormatted,
        usdt: usdtFormatted
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    log.error('余额读取失败', error)
    throw error
  }
}

/**
 * 使用localStorage中的钱包测试
 */
export const testStoredWallet = async () => {
  try {
    console.clear()
    console.log('='.repeat(60))
    console.log('测试: 使用已保存的钱包')
    console.log('='.repeat(60))
    
    // 从localStorage读取钱包
    const walletData = localStorage.getItem('swapx_wallet')
    if (!walletData) {
      throw new Error('未找到已保存的钱包，请先导入钱包')
    }
    
    const wallet = JSON.parse(walletData)
    console.log(`\n找到已保存的钱包: ${wallet.address}`)
    
    // 使用私钥测试余额
    return await testWalletBalance(wallet.privateKey)
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    throw error
  }
}

// 导出到window对象，方便在控制台调用
if (typeof window !== 'undefined') {
  window.testWalletBalance = testWalletBalance
  window.testStoredWallet = testStoredWallet
  
  console.log('\n💡 测试函数已加载到全局对象:')
  console.log('  window.testWalletBalance(privateKey) - 测试指定私钥的余额')
  console.log('  window.testStoredWallet() - 测试localStorage中的钱包余额')
  console.log('\n示例:')
  console.log('  await testStoredWallet()')
}
