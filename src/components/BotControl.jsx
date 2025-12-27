import { useState, useEffect } from 'react'
import { Card, Button, Space, Statistic, Row, Col, Tag } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'

/**
 * 机器人控制组件
 * 功能：启动/停止、显示运行状态、统计信息
 */
export default function BotControl({ 
  wallet, 
  strategyType, 
  strategyConfig,
  onStart, 
  onStop,
  onReset 
}) {
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({
    totalTrades: 0,
    successTrades: 0,
    failedTrades: 0,
    totalVolume: 0,
    runningTime: 0
  })
  const [startTime, setStartTime] = useState(null)

  // 更新运行时间
  useEffect(() => {
    let timer
    if (isRunning && startTime) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setStats(prev => ({ ...prev, runningTime: elapsed }))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isRunning, startTime])

  const handleStart = () => {
    setIsRunning(true)
    setStartTime(Date.now())
    if (onStart) {
      onStart(strategyType, strategyConfig)
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    if (onStop) {
      onStop()
    }
  }

  const handleReset = () => {
    setStats({
      totalTrades: 0,
      successTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      runningTime: 0
    })
    setStartTime(null)
    if (onReset) {
      onReset()
    }
  }

  // 格式化运行时间
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const canStart = wallet && strategyType && !isRunning

  return (
    <Card 
      title={
        <Space>
          <span>机器人控制</span>
          <Tag color={isRunning ? 'green' : 'default'}>
            {isRunning ? '运行中' : '已停止'}
          </Tag>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 控制按钮 */}
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={!canStart}
            size="large"
          >
            启动
          </Button>
          <Button
            danger
            icon={<PauseCircleOutlined />}
            onClick={handleStop}
            disabled={!isRunning}
            size="large"
          >
            停止
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={isRunning}
          >
            重置
          </Button>
        </Space>

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={12}>
            <Statistic 
              title="总交易次数" 
              value={stats.totalTrades} 
              suffix="次"
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title="成功率" 
              value={stats.totalTrades > 0 ? (stats.successTrades / stats.totalTrades * 100).toFixed(1) : 0}
              suffix="%"
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title="交易总额" 
              value={stats.totalVolume.toFixed(2)} 
              suffix="USDT"
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title="运行时间" 
              value={formatTime(stats.runningTime)}
            />
          </Col>
        </Row>
      </Space>
    </Card>
  )
}
