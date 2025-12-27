import { useState, useEffect, useRef } from 'react'
import { Card, Statistic, Row, Col, Button, Alert, Spin } from 'antd'
import { WalletOutlined, ReloadOutlined } from '@ant-design/icons'
import { createProvider, createWallet, getTokenBalance } from '../services/wallet'
import { log, BalanceMonitor } from '../utils/logger'

/**
 * 钱包余额组件
 * 显示XOC（GAS费）、WXOC（交易代币）和USDT余额
 */
export default function WalletBalance({ wallet }) {
  const [balances, setBalances] = useState({
    xoc: '0',
    wxoc: '0',
    usdt: '0'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // 使用ref存储余额监控器实例
  const balanceMonitor = useRef(new BalanceMonitor())

  // 代币地址配置
  const TOKENS = {
    USDT: '0xb575796D293f37F112f3694b8ff48D711FE67EC7',
    WXOC: '0x4eabbaBeBbb358660cA080e8F2bb09E4a911AB4E'  // 实际交易使用WXOC
  }

  // 获取余额
  const fetchBalances = async () => {
    if (!wallet) {
      setBalances({ xoc: '0', wxoc: '0', usdt: '0' })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 创建Provider和Wallet实例
      const provider = createProvider('xoc')
      const walletInstance = createWallet(wallet.privateKey, provider)

      // 获取XOC余额（原生代币，用于GAS费）
      const xocBalance = await provider.getBalance(walletInstance.address)
      const xocFormatted = (parseFloat(xocBalance.toString()) / 1e18).toFixed(4)

      // 获取WXOC余额（ERC20代币，用于交易）
      const wxocBalance = await getTokenBalance(walletInstance, TOKENS.WXOC)
      const wxocFormatted = parseFloat(wxocBalance).toFixed(4)

      // 获取USDT余额
      const usdtBalance = await getTokenBalance(walletInstance, TOKENS.USDT)
      const usdtFormatted = parseFloat(usdtBalance).toFixed(2)

      const newBalances = {
        xoc: xocFormatted,
        wxoc: wxocFormatted,
        usdt: usdtFormatted
      }
      
      setBalances(newBalances)

      // 使用余额监控器记录变化（只在有变化时输出日志）
      balanceMonitor.current.checkAndLog(walletInstance.address, newBalances)
    } catch (err) {
      log.error('获取余额失败', err)
      setError(err.message || '获取余额失败')
    } finally {
      setLoading(false)
    }
  }

  // 钱包变化时自动获取余额
  useEffect(() => {
    if (wallet) {
      fetchBalances()
    }
  }, [wallet])

  if (!wallet) {
    return null
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <WalletOutlined style={{ marginRight: 8 }} />
            钱包余额
          </span>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchBalances}
            loading={loading}
            size="small"
          >
            刷新
          </Button>
        </div>
      }
    >
      {error && (
        <Alert 
          message="获取余额失败" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="XOC (GAS费)"
              value={balances.xoc}
              precision={4}
              valueStyle={{ color: '#3f8600' }}
              suffix="XOC"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="WXOC (交易)"
              value={balances.wxoc}
              precision={4}
              valueStyle={{ color: '#ff6b00' }}
              suffix="WXOC"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="USDT"
              value={balances.usdt}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              suffix="USDT"
            />
          </Col>
        </Row>
      </Spin>
    </Card>
  )
}
