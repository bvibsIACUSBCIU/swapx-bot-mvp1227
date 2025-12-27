import { ethers } from 'ethers'

/**
 * 钱包服务
 * 功能：创建钱包实例、获取余额、连接Provider
 */

// RPC节点配置 - SwapX 测试网
const RPC_CONFIG = {
  xoc: 'https://rpc.xone.org/', // SwapX 测试网 RPC
  chainId: 3721, // SwapX 测试网链ID
}

/**
 * 创建Provider
 */
export const createProvider = (networkName = 'xoc') => {
  const rpcUrl = RPC_CONFIG[networkName]
  if (!rpcUrl) {
    throw new Error(`不支持的网络: ${networkName}`)
  }
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * 从私钥创建钱包实例
 */
export const createWallet = (privateKey, provider) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    return wallet
  } catch (error) {
    throw new Error(`创建钱包失败: ${error.message}`)
  }
}

/**
 * 获取XOC余额
 */
export const getXOCBalance = async (wallet) => {
  try {
    const balance = await wallet.provider.getBalance(wallet.address)
    return ethers.formatEther(balance)
  } catch (error) {
    throw new Error(`获取XOC余额失败: ${error.message}`)
  }
}

/**
 * 获取代币余额
 */
export const getTokenBalance = async (wallet, tokenAddress) => {
  try {
    // ERC20 ABI (只需要balanceOf方法)
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet)
    const balance = await tokenContract.balanceOf(wallet.address)
    const decimals = await tokenContract.decimals()
    
    return ethers.formatUnits(balance, decimals)
  } catch (error) {
    throw new Error(`获取代币余额失败: ${error.message}`)
  }
}

/**
 * 检查代币授权额度
 */
export const checkAllowance = async (wallet, tokenAddress, spenderAddress) => {
  try {
    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet)
    const allowance = await tokenContract.allowance(wallet.address, spenderAddress)
    const decimals = await tokenContract.decimals()
    
    return ethers.formatUnits(allowance, decimals)
  } catch (error) {
    throw new Error(`检查授权额度失败: ${error.message}`)
  }
}

/**
 * 授权代币
 */
export const approveToken = async (wallet, tokenAddress, spenderAddress, amount = null) => {
  try {
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)'
    ]
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet)
    
    // 如果未指定金额，使用最大值
    const approveAmount = amount || ethers.MaxUint256
    
    const tx = await tokenContract.approve(spenderAddress, approveAmount)
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    throw new Error(`授权代币失败: ${error.message}`)
  }
}

/**
 * 获取Gas价格
 */
export const getGasPrice = async (provider) => {
  try {
    const feeData = await provider.getFeeData()
    return feeData.gasPrice
  } catch (error) {
    throw new Error(`获取Gas价格失败: ${error.message}`)
  }
}

/**
 * 估算Gas限制
 */
export const estimateGas = async (wallet, tx) => {
  try {
    const gasLimit = await wallet.estimateGas(tx)
    // 增加20%余量
    return gasLimit * 120n / 100n
  } catch (error) {
    throw new Error(`估算Gas失败: ${error.message}`)
  }
}
