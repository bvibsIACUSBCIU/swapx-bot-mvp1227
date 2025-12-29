import { Card, Row, Col, Statistic, Alert, Button, Space, Modal, message } from 'antd'
import { 
  WalletOutlined, 
  DollarOutlined, 
  SwapOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
  DeleteOutlined 
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import WalletImport from './WalletImport'
import WalletBalance from './WalletBalance'
import TradeHistory from './TradeHistory'
import { clearAllStorage } from '../utils/storage'

/**
 * Dashboard - 钱包概览页面
 * 融合控制台和钱包管理功能
 */
export default function Dashboard({ wallet, onWalletImported }) {
  const [stats, setStats] = useState({
    totalTrades: 0,
    todayTrades: 0,
    totalProfit: 0,
    successRate: 0,
    activeBots: 0
  })

  // 从localStorage加载统计数据
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    try {
      const trades = JSON.parse(localStorage.getItem('swapx_trades') || '[]')
      const bots = JSON.parse(localStorage.getItem('swapx_bots') || '[]')
      
      // 计算今日交易
      const today = new Date().toDateString()
      const todayTrades = trades.filter(t => 
        new Date(t.timestamp).toDateString() === today
      ).length
      
      // 计算总盈亏 - 修正计算逻辑
      const buyTrades = trades.filter(t => t.type === 'BUY')
      const sellTrades = trades.filter(t => t.type === 'SELL')
      const buyUSDT = buyTrades.reduce((sum, t) => sum + (t.amountIn || 0), 0)
      const sellUSDT = sellTrades.reduce((sum, t) => sum + (t.amountOut || 0), 0)
      const totalProfit = sellUSDT - buyUSDT
      
      // 计算成功率
      const successTrades = trades.filter(t => t.status === 'success').length
      const successRate = trades.length > 0 
        ? (successTrades / trades.length * 100).toFixed(1)
        : 0
      
      // 统计活跃机器人
      const activeBots = bots.filter(b => b.isRunning).length
      
      setStats({
        totalTrades: trades.length,
        todayTrades,
        totalProfit,
        successRate: parseFloat(successRate),
        activeBots
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const handleClearAllData = () => {
    Modal.confirm({
      title: '确认清除所有数据',
      content: (
        <div>
          <p>此操作将清除以下所有数据：</p>
          <ul>
            <li>钱包信息</li>
            <li>机器人配置</li>
            <li>交易记录</li>
            <li>日志记录</li>
            <li>应用配置</li>
          </ul>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            此操作不可恢复，请确认！
          </p>
        </div>
      ),
      okText: '确定清除',
      cancelText: '取消',
      okType: 'danger',
      width: 500,
      onOk: () => {
        try {
          clearAllStorage()
          message.success('所有数据已清除')
          // 刷新页面
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } catch (error) {
          message.error('清除数据失败')
          console.error(error)
        }
      }
    })
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

          {/* 交易统计 */}
          <Card 
            title={
              <Space>
                <DollarOutlined />
                <span>交易统计</span>
              </Space>
            }
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={loadStats}
              >
                刷新
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="总交易次数"
                  value={stats.totalTrades}
                  suffix="次"
                  prefix={<SwapOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="今日交易"
                  value={stats.todayTrades}
                  suffix="次"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="累计盈亏"
                  value={stats.totalProfit}
                  precision={2}
                  suffix="USDT"
                  valueStyle={{ 
                    color: stats.totalProfit > 0 ? '#3f8600' : stats.totalProfit < 0 ? '#cf1322' : '#000' 
                  }}
                  prefix={stats.totalProfit > 0 ? <RiseOutlined /> : stats.totalProfit < 0 ? <FallOutlined /> : null}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功率"
                  value={stats.successRate}
                  suffix="%"
                  valueStyle={{ color: stats.successRate > 70 ? '#3f8600' : '#ff6b00' }}
                />
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Alert
                message={`当前有 ${stats.activeBots} 个机器人正在运行`}
                type={stats.activeBots > 0 ? 'success' : 'info'}
                showIcon
              />
            </div>
          </Card>

          {/* 快速操作 */}
          <Card title="快速操作">
            <Space size="large" wrap>
              <Button type="primary" href="#/bots">
                管理机器人
              </Button>
              <Button type="primary" href="#/manual-trade">
                手动交易
              </Button>
              <Button href="#/logs">
                查看日志
              </Button>
              <Button 
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearAllData}
              >
                清除所有数据
              </Button>
            </Space>
          </Card>

          {/* 交易记录 */}
          <TradeHistory />
        </>
      )}
    </div>
  )
}
