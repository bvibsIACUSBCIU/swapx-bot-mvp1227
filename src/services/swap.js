import { ethers } from 'ethers'
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core'
import { Pair, Route, Trade } from '@uniswap/v2-sdk'
import { checkAllowance, approveToken, estimateGas } from './wallet'
import { log, tradeLog } from '../utils/logger'

/**
 * Swap交易服务
 * 基于Uniswap V2协议 - 适配SwapX V2
 */

// ==================== 配置常量 ====================

// SwapX V2 合约地址配置
const CONTRACTS = {
  ROUTER: '0x89eA27957bb86FBFFC2e0ABfc5a5a64BB0343367',  // SwapX V2 Router
  FACTORY: '0x76bDc5a6190Ea31A6D5C7e93a8a2ff4dD15080A6', // SwapX V2 Factory
}

// SwapX 测试网代币配置
const TOKENS = {
  USDT: {
    address: '0xb575796D293f37F112f3694b8ff48D711FE67EC7',
    decimals: 6,
    symbol: 'USDT'
  },
  WXOC: {
    address: '0x4eabbaBeBbb358660cA080e8F2bb09E4a911AB4E',
    decimals: 18,
    symbol: 'WXOC'  // 实际交易使用WXOC，XOC用于GAS费
  }
}

// SwapX 测试网配置
const NETWORK_CONFIG = {
  RPC_URL: 'https://rpc.xone.org/',
  CHAIN_ID: 3721,
  NATIVE_SYMBOL: 'XOC'
}

// 交易配置
const SWAP_CONFIG = {
  SLIPPAGE: 0.5,           // 滑点容忍度 0.5%
  DEADLINE_MINUTES: 20,    // 交易截止时间 20分钟
  GAS_MULTIPLIER: 1.2      // Gas倍数 1.2x
}

// ==================== 辅助函数 ====================

/**
 * 创建Token实例
 * @param {Object} tokenConfig - 代币配置对象
 * @param {number} chainId - 链ID
 * @returns {Token} Token实例
 */
const createToken = (tokenConfig, chainId = NETWORK_CONFIG.CHAIN_ID) => {
  return new Token(
    chainId,
    tokenConfig.address,
    tokenConfig.decimals,
    tokenConfig.symbol
  )
}

/**
 * 获取交易对储备量
 * @param {string} pairAddress - 交易对地址
 * @param {Token} tokenA - 代币A
 * @param {Token} tokenB - 代币B
 * @param {Provider} provider - Provider实例
 * @returns {Promise<Pair>} Pair实例
 */
const fetchPairData = async (pairAddress, tokenA, tokenB, provider) => {
  try {
    const pairAbi = [
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() view returns (address)',
      'function token1() view returns (address)'
    ]
    
    const pairContract = new ethers.Contract(pairAddress, pairAbi, provider)
    
    // 获取储备量
    const reserves = await pairContract.getReserves()
    const reserve0 = reserves[0]
    const reserve1 = reserves[1]
    
    // 获取token顺序（参考priceMonitor.js）
    const token0Address = await pairContract.token0()
    const token1Address = await pairContract.token1()
    
    // 判断哪个是tokenA，哪个是tokenB
    let tokenAReserve, tokenBReserve
    
    if (token0Address.toLowerCase() === tokenA.address.toLowerCase()) {
      tokenAReserve = reserve0
      tokenBReserve = reserve1
    } else if (token1Address.toLowerCase() === tokenA.address.toLowerCase()) {
      tokenAReserve = reserve1
      tokenBReserve = reserve0
    } else {
      throw new Error('交易对中未找到指定代币')
    }
    
    // 创建Pair实例（参考priceMonitor.js的正确方式）
    return new Pair(
      CurrencyAmount.fromRawAmount(tokenA, tokenAReserve.toString()),
      CurrencyAmount.fromRawAmount(tokenB, tokenBReserve.toString())
    )
  } catch (error) {
    throw new Error(`获取交易对数据失败: ${error.message}`)
  }
}

/**
 * 计算交易对地址
 * @param {Token} tokenA - 代币A
 * @param {Token} tokenB - 代币B
 * @returns {string} 交易对地址
 */
export const getPairAddress = (tokenA, tokenB) => {
  // 注意：SwapX V2 SDK 需要传入 Factory 地址来计算交易对地址
  return Pair.getAddress(tokenA, tokenB)
}

// ==================== 主要功能函数 ====================

/**
 * 1. 获取代币价格
 * @param {string} tokenIn - 输入代币符号 ('USDT' 或 'WXOC')
 * @param {string} tokenOut - 输出代币符号 ('USDT' 或 'WXOC')
 * @param {Provider} provider - Provider实例
 * @returns {Promise<number>} 价格（tokenOut/tokenIn）
 */
export const getTokenPrice = async (tokenIn, tokenOut, provider) => {
  try {
    // 标准化代币符号（XOC -> WXOC）
    const normalizeToken = (symbol) => {
      const upper = symbol.toUpperCase()
      return upper === 'XOC' ? 'WXOC' : upper
    }
    
    // 获取代币配置
    const tokenInConfig = TOKENS[normalizeToken(tokenIn)]
    const tokenOutConfig = TOKENS[normalizeToken(tokenOut)]
    
    if (!tokenInConfig || !tokenOutConfig) {
      throw new Error('不支持的代币')
    }
    
    // 获取链ID
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
    
    // 创建Token实例
    const tokenInInstance = createToken(tokenInConfig, chainId)
    const tokenOutInstance = createToken(tokenOutConfig, chainId)
    
    // 获取交易对地址
    const pairAddress = getPairAddress(tokenInInstance, tokenOutInstance)
    
    // 获取交易对数据（修复：正确处理储备量和token顺序）
    const pair = await fetchPairData(pairAddress, tokenInInstance, tokenOutInstance, provider)
    
    // 使用priceOf方法获取准确价格（参考priceMonitor.js）
    const priceObj = pair.priceOf(tokenInInstance)
    const price = parseFloat(priceObj.toSignificant(6))
    
    return price
  } catch (error) {
    log.error('获取价格失败', error)
    throw new Error(`获取价格失败: ${error.message}`)
  }
}

/**
 * 2. 执行Swap交易
 * @param {Wallet} wallet - 钱包实例
 * @param {string} tokenIn - 输入代币符号
 * @param {string} tokenOut - 输出代币符号
 * @param {number} amount - 输入金额
 * @param {number} slippage - 滑点容忍度（默认0.5%）
 * @returns {Promise<Object>} 交易结果 { hash, receipt }
 */
export const executeSwap = async (wallet, tokenIn, tokenOut, amount, slippage = SWAP_CONFIG.SLIPPAGE) => {
  try {
    tradeLog.info(`开始执行交易: ${amount} ${tokenIn} -> ${tokenOut}`)
    
    // 1. 验证参数
    if (!wallet || !tokenIn || !tokenOut || !amount || amount <= 0) {
      throw new Error('无效的交易参数')
    }
    
    // 标准化代币符号（XOC -> WXOC）
    const normalizeToken = (symbol) => {
      const upper = symbol.toUpperCase()
      return upper === 'XOC' ? 'WXOC' : upper
    }
    
    // 获取代币配置
    const tokenInConfig = TOKENS[normalizeToken(tokenIn)]
    const tokenOutConfig = TOKENS[normalizeToken(tokenOut)]
    
    if (!tokenInConfig || !tokenOutConfig) {
      throw new Error('不支持的代币')
    }
    
    // 获取链ID
    const network = await wallet.provider.getNetwork()
    const chainId = Number(network.chainId)
    
    // 2. 创建Token实例
    const tokenInInstance = createToken(tokenInConfig, chainId)
    const tokenOutInstance = createToken(tokenOutConfig, chainId)
    
    // 3. 检查并授权代币
    const allowance = await checkAllowance(wallet, tokenInConfig.address, CONTRACTS.ROUTER)
    
    if (parseFloat(allowance) < amount) {
      tradeLog.warning('授权额度不足，开始授权...')
      const approveTx = await approveToken(wallet, tokenInConfig.address, CONTRACTS.ROUTER)
      tradeLog.success(`授权成功: ${approveTx}`)
      
      // 等待授权确认
      await wallet.provider.waitForTransaction(approveTx)
    }
    
    // 4. 获取交易对数据
    const pairAddress = getPairAddress(tokenInInstance, tokenOutInstance)
    const pair = await fetchPairData(pairAddress, tokenInInstance, tokenOutInstance, wallet.provider)
    
    // 5. 构建交易路由
    const route = new Route([pair], tokenInInstance, tokenOutInstance)
    
    // 6. 计算输入金额（考虑精度）
    const amountIn = ethers.parseUnits(amount.toString(), tokenInConfig.decimals)
    const currencyAmount = CurrencyAmount.fromRawAmount(tokenInInstance, amountIn.toString())
    
    // 7. 创建Trade实例
    const trade = new Trade(route, currencyAmount, TradeType.EXACT_INPUT)
    
    // 8. 计算最小输出（考虑滑点）
    const slippageTolerance = new Percent(Math.floor(slippage * 100), 10000)
    const amountOutMin = trade.minimumAmountOut(slippageTolerance)
    
    tradeLog.info(`预期输出: ${trade.outputAmount.toSignificant(6)} ${tokenOut}, 最小输出: ${amountOutMin.toSignificant(6)} ${tokenOut} (滑点${slippage}%)`)
    
    // 9. 设置交易截止时间
    const deadline = Math.floor(Date.now() / 1000) + SWAP_CONFIG.DEADLINE_MINUTES * 60
    
    // 10. 构建交易参数
    const path = [tokenInConfig.address, tokenOutConfig.address]
    const routerAbi = [
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)'
    ]
    
    const routerContract = new ethers.Contract(CONTRACTS.ROUTER, routerAbi, wallet)
    
    // 11. 估算Gas
    let gasLimit
    try {
      const estimatedGas = await routerContract.swapExactTokensForTokens.estimateGas(
        amountIn,
        amountOutMin.quotient.toString(),
        path,
        wallet.address,
        deadline
      )
      // 增加20%余量
      gasLimit = estimatedGas * BigInt(Math.floor(SWAP_CONFIG.GAS_MULTIPLIER * 100)) / 100n
    } catch (error) {
      log.error('Gas估算失败', error)
      throw new Error(`Gas估算失败: ${error.message}`)
    }
    
    // 12. 获取Gas价格
    const feeData = await wallet.provider.getFeeData()
    const gasPrice = feeData.gasPrice
    
    // 13. 检查余额
    const balance = await wallet.provider.getBalance(wallet.address)
    const estimatedGasCost = gasLimit * gasPrice
    
    if (balance < estimatedGasCost) {
      throw new Error(`余额不足，需要至少 ${ethers.formatEther(estimatedGasCost)} ${NETWORK_CONFIG.NATIVE_SYMBOL} 支付Gas费`)
    }
    
    // 14. 发送交易
    const tx = await routerContract.swapExactTokensForTokens(
      amountIn,
      amountOutMin.quotient.toString(),
      path,
      wallet.address,
      deadline,
      {
        gasLimit,
        gasPrice
      }
    )
    
    tradeLog.success(`交易已发送: ${tx.hash}`)
    
    return {
      hash: tx.hash,
      tx: tx
    }
    
  } catch (error) {
    tradeLog.error('交易执行失败', error)
    
    // 详细错误处理
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('余额不足，请充值后重试')
    } else if (error.message.includes('TRANSFER_FROM_FAILED')) {
      throw new Error('代币转账失败，请检查授权')
    } else if (error.message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      throw new Error('输出金额不足，请增加滑点容忍度')
    } else if (error.message.includes('EXPIRED')) {
      throw new Error('交易已过期，请重新发起')
    }
    
    throw error
  }
}

/**
 * 3. 等待交易确认
 * @param {string} txHash - 交易哈希
 * @param {Provider} provider - Provider实例
 * @param {number} confirmations - 需要的确认数（默认1）
 * @returns {Promise<Object>} 交易收据
 */
export const waitForTransaction = async (txHash, provider, confirmations = 1) => {
  try {
    tradeLog.info(`等待交易确认: ${txHash} (需要${confirmations}个确认)`)
    
    // 等待交易确认
    const receipt = await provider.waitForTransaction(txHash, confirmations)
    
    if (!receipt) {
      throw new Error('交易收据为空')
    }
    
    // 检查交易状态
    if (receipt.status === 0) {
      tradeLog.error('交易失败', { hash: txHash, receipt })
      throw new Error('交易被回滚')
    }
    
    // 计算Gas费用
    const gasUsed = receipt.gasUsed
    const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice
    const gasCost = gasUsed * gasPrice
    
    tradeLog.success(`交易确认成功 (区块#${receipt.blockNumber}, Gas费用: ${ethers.formatEther(gasCost)} ${NETWORK_CONFIG.NATIVE_SYMBOL})`, {
      hash: txHash,
      gasUsed: gasUsed.toString()
    })
    
    return {
      success: true,
      hash: txHash,
      blockNumber: receipt.blockNumber,
      gasUsed: gasUsed.toString(),
      gasPrice: gasPrice.toString(),
      gasCost: ethers.formatEther(gasCost),
      receipt: receipt
    }
    
  } catch (error) {
    tradeLog.error('等待交易确认失败', error)
    throw new Error(`等待交易确认失败: ${error.message}`)
  }
}

// ==================== 便捷函数 ====================

/**
 * 获取WXOC/USDT价格
 * @param {Provider} provider - Provider实例
 * @returns {Promise<number>} WXOC以USDT计价的价格
 */
export const getWXOCPrice = async (provider) => {
  return getTokenPrice('WXOC', 'USDT', provider)
}

// 为了兼容性，保留旧名称但内部调用WXOC
export const getXOCPrice = getWXOCPrice

/**
 * 买入WXOC（用USDT买）
 * @param {Wallet} wallet - 钱包实例
 * @param {number} usdtAmount - USDT金额
 * @param {number} slippage - 滑点
 * @returns {Promise<Object>} 交易结果
 */
export const buyWXOC = async (wallet, usdtAmount, slippage = SWAP_CONFIG.SLIPPAGE) => {
  const result = await executeSwap(wallet, 'USDT', 'WXOC', usdtAmount, slippage)
  const receipt = await waitForTransaction(result.hash, wallet.provider)
  return { ...result, ...receipt }
}

// 为了兼容性，保留旧名称但内部调用WXOC
export const buyXOC = buyWXOC

/**
 * 卖出WXOC（换成USDT）
 * @param {Wallet} wallet - 钱包实例
 * @param {number} wxocAmount - WXOC金额
 * @param {number} slippage - 滑点
 * @returns {Promise<Object>} 交易结果
 */
export const sellWXOC = async (wallet, wxocAmount, slippage = SWAP_CONFIG.SLIPPAGE) => {
  const result = await executeSwap(wallet, 'WXOC', 'USDT', wxocAmount, slippage)
  const receipt = await waitForTransaction(result.hash, wallet.provider)
  return { ...result, ...receipt }
}

// 为了兼容性，保留旧名称但内部调用WXOC
export const sellXOC = sellWXOC

/**
 * 估算输出金额
 * @param {Provider} provider - Provider实例
 * @param {string} tokenIn - 输入代币
 * @// 标准化代币符号（XOC -> WXOC）
    const normalizeToken = (symbol) => {
      const upper = symbol.toUpperCase()
      return upper === 'XOC' ? 'WXOC' : upper
    }
    
    const tokenInConfig = TOKENS[normalizeToken(tokenIn)]
    const tokenOutConfig = TOKENS[normalizeToken(tokenOut
 * @returns {Promise<number>} 预期输出金额
 */
export const estimateOutput = async (provider, tokenIn, tokenOut, amountIn) => {
  try {
    const tokenInConfig = TOKENS[tokenIn.toUpperCase()]
    const tokenOutConfig = TOKENS[tokenOut.toUpperCase()]
    
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
    
    const tokenInInstance = createToken(tokenInConfig, chainId)
    const tokenOutInstance = createToken(tokenOutConfig, chainId)
    
    const pairAddress = getPairAddress(tokenInInstance, tokenOutInstance)
    const pair = await fetchPairData(pairAddress, tokenInInstance, tokenOutInstance, provider)
    
    const route = new Route([pair], tokenInInstance, tokenOutInstance)
    const amountInParsed = ethers.parseUnits(amountIn.toString(), tokenInConfig.decimals)
    const currencyAmount = CurrencyAmount.fromRawAmount(tokenInInstance, amountInParsed.toString())
    
    const trade = new Trade(route, currencyAmount, TradeType.EXACT_INPUT)
    const amountOut = parseFloat(trade.outputAmount.toSignificant(6))
    
    return amountOut
  } catch (error) {
    throw new Error(`估算输出失败: ${error.message}`)
  }
}

// 导出配置（供外部使用）
export const SWAP_CONTRACTS = CONTRACTS
export const SWAP_TOKENS = TOKENS
export const SWAP_NETWORK = NETWORK_CONFIG

export default {
  getTokenPrice,
  executeSwap,
  waitForTransaction,
  getWXOCPrice,
  getXOCPrice,  // 兼容旧API
  buyWXOC,
  buyXOC,       // 兼容旧API
  sellWXOC,
  sellXOC,      // 兼容旧API
  estimateOutput,
  getPairAddress,
  CONTRACTS,
  TOKENS,
  NETWORK_CONFIG
}
