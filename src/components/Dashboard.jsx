import { Card, Row, Col, Statistic, Alert, Button, Space } from 'antd'
import { 
  WalletOutlined, 
  DollarOutlined, 
  RobotOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import WalletImport from './WalletImport'
import WalletBalance from './WalletBalance'
import TradeHistory from './TradeHistory'
import { createProvider } from '../services/wallet'
import { getWXOCPrice } from '../services/swap'

/**
 * Dashboard - 钱包概览页面
 * 融合控制台和钱包管理功能
 */
export default function Dashboard({ wallet, onWalletImported }) {
  const [activeBots, setActiveBots] = useState(0)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceLoading, setPriceLoading] = useState(false)

  // 从 localStorage 加载统计数据
  useEffect(() => {
    loadActiveBots()
  }, [])

  // 加载价格（仅在有钱包时）
  useEffect(() => {
    if (wallet) {
      loadPrice()
      // 每 10 秒更新一次价格
      const timer = setInterval(() => {
        loadPrice()
      }, 10000)
      return () => clearInterval(timer)
    }
  }, [wallet])

  const loadPrice = async () => {
    if (!wallet) return
    try {
      setPriceLoading(true)
      const provider = createProvider('xoc')
      const price = await getWXOCPrice(provider)
      setCurrentPrice(price)
    } catch (error) {
      console.error('获取价格失败:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const loadActiveBots = () => {
    try {
      const bots = JSON.parse(localStorage.getItem('swapx_bots') || '[]')
      const active = bots.filter(b => b.isRunning).length
      setActiveBots(active)
    } catch (error) {
      console.error('加载机器人状态失败:', error)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 钱包导入/显示 */}
      {!wallet ? (
        <WalletImport onWalletImported={onWalletImported} />
      ) : (
        <>
          {/* 钱包信息卡片 */}
          <Card 
            title={
              <Space>
                <WalletOutlined />
                <span>我的钱包</span>
                <Button 
                  type="link" 
                  danger 
                  size="small"
                  onClick={() => onWalletImported(null)}
                >
                  断开
                </Button>
              </Space>
            }
            extra={
              <Space>
                <span style={{ color: '#888', fontSize: '14px' }}>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
              </Space>
            }
          >
            <WalletBalance wallet={wallet} />
          </Card>

          {/* 实时价格 */}
          <Card 
            title={
              <Space>
                <DollarOutlined />
                <span>XOC/USDT 实时价格</span>
              </Space>
            }
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                loading={priceLoading}
                onClick={loadPrice}
              >
                刷新
              </Button>
            }
          >
            <Statistic
              value={currentPrice}
              precision={6}
              suffix="USDT"
              valueStyle={{ fontSize: '32px', color: '#1890ff' }}
            />
          </Card>

          {/* 机器人状态 */}
          <Card 
            title={
              <Space>
                <RobotOutlined />
                <span>机器人状态</span>
              </Space>
            }
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={loadActiveBots}
              >
                刷新
              </Button>
            }
          >
            <Alert
              message={`当前有 ${activeBots} 个机器人正在运行`}
              type={activeBots > 0 ? 'success' : 'info'}
              showIcon
            />
          </Card>

          {/* 交易记录 */}
          <TradeHistory />
        </>
      )}
    </div>
  )
}
