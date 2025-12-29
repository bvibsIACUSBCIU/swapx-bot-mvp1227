import { Table, Card, Tag, Button, Space, Statistic, Row, Col, Modal, message } from 'antd'
import { 
  SwapOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined 
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { getTrades, clearTrades, exportTrades } from '../utils/storage'
import dayjs from 'dayjs'

/**
 * TradeHistory - 交易记录表格组件
 * 显示所有交易记录，包括手动交易和机器人交易
 */
export default function TradeHistory() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalBuy: 0,
    totalSell: 0,
    totalProfit: 0
  })

  useEffect(() => {
    loadTrades()
  }, [])

  const loadTrades = () => {
    setLoading(true)
    try {
      const allTrades = getTrades()
      // 按时间倒序排列（最新的在前）
      const sortedTrades = allTrades.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
      setTrades(sortedTrades)
      calculateStats(allTrades)
    } catch (error) {
      message.error('加载交易记录失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (allTrades) => {
    const buyTrades = allTrades.filter(t => t.type === 'BUY')
    const sellTrades = allTrades.filter(t => t.type === 'SELL')
    
    const totalBuy = buyTrades.reduce((sum, t) => sum + (t.amountOut || 0), 0)
    const totalSell = sellTrades.reduce((sum, t) => sum + (t.amountOut || 0), 0)
    
    // 简单计算：卖出USDT - 买入USDT
    const buyUSDT = buyTrades.reduce((sum, t) => sum + (t.amountIn || 0), 0)
    const sellUSDT = sellTrades.reduce((sum, t) => sum + (t.amountOut || 0), 0)
    const totalProfit = sellUSDT - buyUSDT

    setStats({
      totalTrades: allTrades.length,
      totalBuy,
      totalSell,
      totalProfit
    })
  }

  const handleClearTrades = () => {
    Modal.confirm({
      title: '确认清除',
      content: '确定要清除所有交易记录吗？此操作不可恢复！',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        clearTrades()
        setTrades([])
        setStats({
          totalTrades: 0,
          totalBuy: 0,
          totalSell: 0,
          totalProfit: 0
        })
        message.success('交易记录已清除')
      }
    })
  }

  const handleExport = () => {
    try {
      exportTrades()
      message.success('交易记录已导出')
    } catch (error) {
      message.error('导出失败')
      console.error(error)
    }
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => (
        <Tag 
          icon={type === 'BUY' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
          color={type === 'BUY' ? 'green' : 'red'}
        >
          {type === 'BUY' ? '买入' : '卖出'}
        </Tag>
      )
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source, record) => {
        if (source === 'bot') {
          const botTypeMap = {
            buysell: '低买高卖',
            dca: '定投策略',
            grid: '网格策略'
          }
          return (
            <Tag color="blue">
              🤖 {botTypeMap[record.botType] || '机器人'}
            </Tag>
          )
        }
        return <Tag color="orange">👤 手动</Tag>
      }
    },
    {
      title: '交易对',
      key: 'pair',
      width: 150,
      render: (_, record) => (
        <span>{record.tokenFrom} → {record.tokenTo}</span>
      )
    },
    {
      title: '输入数量',
      dataIndex: 'amountIn',
      key: 'amountIn',
      width: 120,
      align: 'right',
      render: (amount, record) => (
        <span>{amount?.toFixed(6)} {record.tokenFrom}</span>
      )
    },
    {
      title: '输出数量',
      dataIndex: 'amountOut',
      key: 'amountOut',
      width: 120,
      align: 'right',
      render: (amount, record) => (
        <span style={{ fontWeight: 'bold' }}>
          {amount?.toFixed(6)} {record.tokenTo}
        </span>
      )
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'right',
      render: (price) => (
        <span>{price?.toFixed(6)} USDT</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      )
    },
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      width: 180,
      ellipsis: true,
      render: (hash) => (
        <a 
          href={`https://explorer.xone.org/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        >
          {hash?.slice(0, 10)}...{hash?.slice(-8)}
        </a>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 统计卡片 */}
      <Card>
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
              title="累计买入"
              value={stats.totalBuy}
              precision={2}
              suffix="XOC"
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowDownOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="累计卖出"
              value={stats.totalSell}
              precision={2}
              suffix="USDT"
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowUpOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="净盈亏"
              value={stats.totalProfit}
              precision={2}
              suffix="USDT"
              valueStyle={{ 
                color: stats.totalProfit > 0 ? '#3f8600' : stats.totalProfit < 0 ? '#cf1322' : '#000'
              }}
              prefix={stats.totalProfit >= 0 ? '+' : ''}
            />
          </Col>
        </Row>
      </Card>

      {/* 交易记录表格 */}
      <Card
        title={
          <Space>
            <SwapOutlined />
            <span>交易记录</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadTrades}
            >
              刷新
            </Button>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport}
            >
              导出
            </Button>
            <Button 
              danger
              icon={<DeleteOutlined />} 
              onClick={handleClearTrades}
            >
              清除记录
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={trades}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  )
}
