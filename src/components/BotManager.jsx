import { useState, useEffect, useRef } from 'react'
import { Button, Modal, Select, Input, Space, Alert, Empty } from 'antd'
import { PlusOutlined, RobotOutlined } from '@ant-design/icons'
import BotCard from './BotCard'
import { saveBots, getBots } from '../utils/storage'
import { log } from '../utils/logger'
import { BuySellStrategy } from '../services/strategies/BuySellStrategy'
import { DCAStrategy } from '../services/strategies/DCAStrategy'
import { GridStrategy } from '../services/strategies/GridStrategy'
import { ethers } from 'ethers'

/**
 * BotManager - 策略机器人管理页面
 * 展示所有机器人，支持添加、删除、配置
 */
export default function BotManager({ wallet }) {
  const [bots, setBots] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBotType, setNewBotType] = useState('buysell')
  const [newBotName, setNewBotName] = useState('')
  
  // 使用ref保存策略实例和定时器，防止重复创建
  const strategyInstancesRef = useRef(new Map())
  const statsTimersRef = useRef(new Map())

  // 加载机器人列表
  useEffect(() => {
    loadBots()
  }, [])

  // 保存机器人到localStorage
  useEffect(() => {
    if (bots.length > 0) {
      saveBots(bots)
    }
  }, [bots])

  // 组件卸载时清理所有定时器和策略实例
  useEffect(() => {
    return () => {
      // 停止所有运行中的策略
      strategyInstancesRef.current.forEach((strategy) => {
        if (strategy && strategy.stop) {
          strategy.stop()
        }
      })
      strategyInstancesRef.current.clear()

      // 清理所有统计定时器
      statsTimersRef.current.forEach((timer) => {
        if (timer) {
          clearInterval(timer)
        }
      })
      statsTimersRef.current.clear()
    }
  }, [])

  const loadBots = () => {
    const savedBots = getBots() || []
    setBots(savedBots)
  }

  // 添加新机器人
  const handleAddBot = () => {
    const newBot = {
      id: Date.now().toString(),
      name: newBotName || `${getStrategyName(newBotType)} ${bots.length + 1}`,
      type: newBotType,
      isRunning: false,
      config: getDefaultConfig(newBotType),
      stats: {
        totalTrades: 0,
        successTrades: 0,
        failedTrades: 0,
        totalVolume: 0,
        runningTime: 0
      },
      createdAt: new Date().toISOString()
    }

    setBots([...bots, newBot])
    setIsModalOpen(false)
    setNewBotName('')
    setNewBotType('buysell')
    
    log.success('机器人创建成功', newBot)
  }

  // 更新机器人配置
  const handleUpdateBot = (id, config) => {
    setBots(bots.map(bot => 
      bot.id === id ? { ...bot, config } : bot
    ))
    log.info('机器人配置已更新', { id, config })
  }

  // 删除机器人
  const handleDeleteBot = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个机器人吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        // 如果机器人正在运行，先停止它
        const bot = bots.find(b => b.id === id)
        if (bot && bot.isRunning) {
          stopBot(bot)
        }
        
        // 清理策略实例和定时器
        strategyInstancesRef.current.delete(id)
        const timer = statsTimersRef.current.get(id)
        if (timer) {
          clearInterval(timer)
          statsTimersRef.current.delete(id)
        }
        
        setBots(bots.filter(bot => bot.id !== id))
        log.warning('机器人已删除', { id })
      }
    })
  }

  // 切换机器人状态
  const handleToggleBot = async (id) => {
    const bot = bots.find(b => b.id === id)
    if (!bot) return

    const newStatus = !bot.isRunning
    
    if (newStatus) {
      // 先更新UI状态
      setBots(prevBots => prevBots.map(b => 
        b.id === id ? { ...b, isRunning: true } : b
      ))
      // 启动机器人
      await startBot(bot)
    } else {
      // 停止机器人
      stopBot(bot)
      // 更新UI状态
      setBots(prevBots => prevBots.map(b => 
        b.id === id ? { ...b, isRunning: false } : b
      ))
    }
  }

  // 启动机器人
  const startBot = async (bot) => {
    try {
      log.info('启动机器人', bot)
      
      if (!wallet) {
        log.error('钱包未连接', bot)
        // 恢复停止状态
        setBots(prevBots => prevBots.map(b => 
          b.id === bot.id ? { ...b, isRunning: false } : b
        ))
        return
      }

      // 从保存的钱包数据创建完整的 Wallet 实例（包含 provider）
      const provider = new ethers.JsonRpcProvider('https://rpc.xone.org/')
      const walletInstance = new ethers.Wallet(wallet.privateKey, provider)

      // 创建策略实例
      let strategy
      switch (bot.type) {
        case 'buysell':
          strategy = new BuySellStrategy(bot.config, walletInstance, null)
          break
        case 'dca':
          strategy = new DCAStrategy(bot.config, walletInstance, null)
          break
        case 'grid':
          strategy = new GridStrategy(bot.config, walletInstance, null)
          break
        default:
          log.error('未知策略类型', bot.type)
          return
      }

      // 保存策略实例
      strategyInstancesRef.current.set(bot.id, strategy)

      // 启动策略
      await strategy.start()

      // 记录启动时间
      const startTime = Date.now()
      
      // 启动运行时长统计定时器
      const timer = setInterval(() => {
        const runningTime = Math.floor((Date.now() - startTime) / 1000)
        
        setBots(prevBots => prevBots.map(b => {
          if (b.id === bot.id) {
            // 获取策略的统计数据
            const strategyStats = strategy.stats || {}
            
            return {
              ...b,
              stats: {
                ...b.stats,
                runningTime,
                // 如果策略有统计数据，同步更新
                totalTrades: (strategyStats.totalBuyCount || 0) + (strategyStats.totalSellCount || 0),
                successTrades: (strategyStats.totalBuyCount || 0) + (strategyStats.totalSellCount || 0),
                totalVolume: (strategyStats.totalBuyAmount || 0) + (strategyStats.totalSellAmount || 0)
              }
            }
          }
          return b
        }))
      }, 1000) // 每秒更新一次

      statsTimersRef.current.set(bot.id, timer)

      log.success('机器人启动成功', { id: bot.id, type: bot.type })
    } catch (error) {
      log.error('启动机器人失败', error.message)
      
      // 清理可能已经创建的策略实例
      strategyInstancesRef.current.delete(bot.id)
      
      // 出错时更新状态为停止，但不调用 stop()（因为可能根本没启动成功）
      setBots(prevBots => prevBots.map(b => 
        b.id === bot.id ? { ...b, isRunning: false } : b
      ))
    }
  }

  // 停止机器人
  const stopBot = (bot) => {
    try {
      log.info('停止机器人', bot)
      
      // 获取策略实例并停止
      const strategy = strategyInstancesRef.current.get(bot.id)
      if (strategy && strategy.stop) {
        strategy.stop()
      }
      
      // 清理策略实例
      strategyInstancesRef.current.delete(bot.id)
      
      // 清理运行时长定时器
      const timer = statsTimersRef.current.get(bot.id)
      if (timer) {
        clearInterval(timer)
        statsTimersRef.current.delete(bot.id)
      }

      log.success('机器人已停止', { id: bot.id })
    } catch (error) {
      log.error('停止机器人失败', error.message)
    }
  }

  // 获取策略默认配置
  const getDefaultConfig = (type) => {
    const configs = {
      buysell: {
        buyThreshold: 0.082,
        sellThreshold: 0.15,
        tradeAmount: 1,
        checkInterval: 30
      },
      dca: {
        amount: 10,
        interval: 60,
        totalTimes: 10
      },
      grid: {
        gridCount: 5,
        lowerPrice: 0.08,
        upperPrice: 0.12,
        amountPerGrid: 10
      }
    }
    return configs[type] || {}
  }

  // 获取策略名称
  const getStrategyName = (type) => {
    const names = {
      buysell: '低买高卖',
      dca: '定投策略',
      grid: '网格策略'
    }
    return names[type] || type
  }

  if (!wallet) {
    return (
      <Alert
        message="请先连接钱包"
        description="需要先在Dashboard页面导入钱包才能使用机器人功能"
        type="warning"
        showIcon
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          <RobotOutlined /> 策略机器人管理
        </h2>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            添加机器人
          </Button>
        </Space>
      </div>

      <Alert
        message={`当前共有 ${bots.length} 个机器人，其中 ${bots.filter(b => b.isRunning).length} 个正在运行`}
        type="info"
        showIcon
      />

      {bots.length === 0 ? (
        <Empty
          description="暂无机器人，点击上方按钮添加"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {bots.map(bot => (
            <BotCard
              key={bot.id}
              bot={bot}
              onUpdate={handleUpdateBot}
              onDelete={handleDeleteBot}
              onToggle={handleToggleBot}
            />
          ))}
        </div>
      )}

      {/* 添加机器人弹窗 */}
      <Modal
        title="添加新机器人"
        open={isModalOpen}
        onOk={handleAddBot}
        onCancel={() => setIsModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>机器人名称</label>
            <Input
              placeholder="可选，留空自动命名"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
            />
          </div>
          
          <div>
            <label>策略类型</label>
            <Select
              value={newBotType}
              onChange={setNewBotType}
              style={{ width: '100%' }}
            >
              <Select.Option value="buysell">低买高卖</Select.Option>
              <Select.Option value="dca">定投策略 (DCA)</Select.Option>
              <Select.Option value="grid">网格策略 (Grid)</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  )
}
