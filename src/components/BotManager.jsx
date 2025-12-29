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
import botRunner from '../services/BotRunner'

/**
 * BotManager - 策略机器人管理页面
 * 展示所有机器人，支持添加、删除、配置
 */
export default function BotManager({ wallet }) {
  const [bots, setBots] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBotType, setNewBotType] = useState('buysell')
  const [newBotName, setNewBotName] = useState('')
  
  // 使用ref保存最新的bots状态
  const botsRef = useRef(bots)
  const healthCheckTimerRef = useRef(null)

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

  // 同步bots到ref
  useEffect(() => {
    botsRef.current = bots
  }, [bots])

  // 健壮性监控 - 定期检查机器人状态
  useEffect(() => {
    // 每10秒检查一次机器人状态
    healthCheckTimerRef.current = setInterval(() => {
      const currentBots = botsRef.current
      currentBots.forEach(bot => {
        if (bot.isRunning) {
          // 检查策略是否真的在运行
          if (!botRunner.isStrategyRunning(bot.id)) {
            log.warning('检测到机器人异常', { 
              id: bot.id, 
              name: bot.name,
              reason: '策略已停止但UI显示运行中'
            })
            // 同步状态
            setBots(prevBots => prevBots.map(b => 
              b.id === bot.id ? { ...b, isRunning: false } : b
            ))
          }
        }
      })
    }, 10000)

    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current)
      }
      // 不清理策略实例，让机器人继续运行
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
          stopBot(bot, '机器人被删除')
        }
        
        setBots(bots.filter(bot => bot.id !== id))
        log.warning('机器人已删除', { id })
      }
    })
  }

  // 切换机器人状态
  const handleToggleBot = (id) => {
    const bot = bots.find(b => b.id === id)
    if (!bot) return

    const newStatus = !bot.isRunning
    
    if (newStatus) {
      // 先更新UI状态
      setBots(prevBots => prevBots.map(b => 
        b.id === id ? { ...b, isRunning: true } : b
      ))
      // 启动机器人（不await，异步执行）
      startBot(bot)
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
  const startBot = (bot) => {
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

      // 注册策略到全局BotRunner
      botRunner.registerStrategy(bot.id, strategy)

      // 记录启动时间
      const startTime = Date.now()

      // 启动策略（同步返回，不阻塞）
      botRunner.startStrategy(bot.id)
      
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
      }, 1000)

      botRunner.registerTimer(bot.id, timer)

      log.success('机器人启动成功', { id: bot.id, type: bot.type })
    } catch (error) {
      log.error('启动机器人失败', error.message)
      
      // 清理可能已经创建的策略实例
      botRunner.stopStrategy(bot.id, '启动失败')
      
      // 出错时更新状态为停止，但不调用 stop()（因为可能根本没启动成功）
      setBots(prevBots => prevBots.map(b => 
        b.id === bot.id ? { ...b, isRunning: false } : b
      ))
    }
  }

  // 停止机器人
  const stopBot = (bot, reason = '用户手动停止') => {
    try {
      log.info('停止机器人', { bot, reason })
      
      // 使用BotRunner停止策略
      botRunner.stopStrategy(bot.id, reason)

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
