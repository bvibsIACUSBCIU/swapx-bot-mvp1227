import { useState } from 'react'
import { Card, Form, InputNumber, Select, Button, Space, Tag, Switch, Collapse, Alert } from 'antd'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  ThunderboltFilled
} from '@ant-design/icons'

const { Panel } = Collapse

/**
 * BotCard - 单个策略机器人卡片
 * 支持独立配置、启停、删除
 */
export default function BotCard({ bot, onUpdate, onDelete, onToggle }) {
  const [isEditing, setIsEditing] = useState(false)
  const [config, setConfig] = useState(bot.config)

  // 保存配置
  const handleSave = () => {
    onUpdate(bot.id, config)
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancel = () => {
    setConfig(bot.config)
    setIsEditing(false)
  }

  // 渲染策略配置表单
  const renderConfig = () => {
    switch (bot.type) {
      case 'buysell':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item label="买入阈值 (USDT)">
              <InputNumber
                value={config.buyThreshold}
                onChange={(v) => setConfig({ ...config, buyThreshold: v })}
                min={0.01}
                max={1}
                step={0.001}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="低于此价格时买入"
              />
            </Form.Item>
            
            <Form.Item label="卖出阈值 (USDT)">
              <InputNumber
                value={config.sellThreshold}
                onChange={(v) => setConfig({ ...config, sellThreshold: v })}
                min={0.01}
                max={1}
                step={0.01}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="高于此价格时卖出"
              />
            </Form.Item>

            <Form.Item label="交易金额 (USDT)">
              <InputNumber
                value={config.tradeAmount}
                onChange={(v) => setConfig({ ...config, tradeAmount: v })}
                min={0.1}
                max={1000}
                step={0.1}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
              />
            </Form.Item>

            <Form.Item label="检查间隔">
              <Select
                value={config.checkInterval}
                onChange={(v) => setConfig({ ...config, checkInterval: v })}
                disabled={!isEditing || bot.isRunning}
                style={{ width: '100%' }}
              >
                <Select.Option value={10}>10秒</Select.Option>
                <Select.Option value={30}>30秒</Select.Option>
                <Select.Option value={60}>1分钟</Select.Option>
                <Select.Option value={300}>5分钟</Select.Option>
              </Select>
            </Form.Item>
          </Space>
        )
      
      case 'dca':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item label="单次定投金额 (USDT)">
              <InputNumber
                value={config.amount}
                onChange={(v) => setConfig({ ...config, amount: v })}
                min={0.1}
                max={10000}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="每次买入金额"
              />
            </Form.Item>
            
            <Form.Item label="定投周期">
              <Select
                value={config.interval}
                onChange={(v) => setConfig({ ...config, interval: v })}
                disabled={!isEditing || bot.isRunning}
                style={{ width: '100%' }}
              >
                <Select.Option value={60}>每1分钟</Select.Option>
                <Select.Option value={300}>每5分钟</Select.Option>
                <Select.Option value={3600}>每1小时</Select.Option>
                <Select.Option value={14400}>每4小时</Select.Option>
                <Select.Option value={86400}>每天</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="总预算上限 (USDT)">
              <InputNumber
                value={config.totalBudget}
                onChange={(v) => setConfig({ ...config, totalBudget: v })}
                min={1}
                max={100000}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="计划总投入金额"
              />
            </Form.Item>

            <Form.Item label="价格保护 (可选)">
              <InputNumber
                value={config.maxPrice}
                onChange={(v) => setConfig({ ...config, maxPrice: v })}
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="高于此价格暂停定投"
              />
            </Form.Item>
          </Space>
        )
      
      case 'grid':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item label="总投入资金 (USDT)">
              <InputNumber
                value={config.totalInvestment}
                onChange={(v) => setConfig({ ...config, totalInvestment: v })}
                min={1}
                max={100000}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
                placeholder="网格策略总资金"
              />
            </Form.Item>

            <Form.Item label="网格数量">
              <InputNumber
                value={config.gridCount}
                onChange={(v) => setConfig({ ...config, gridCount: v })}
                min={2}
                max={50}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
              />
            </Form.Item>

            <Form.Item label="价格下限 (USDT)">
              <InputNumber
                value={config.lowerPrice}
                onChange={(v) => setConfig({ ...config, lowerPrice: v })}
                min={0.01}
                step={0.01}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
              />
            </Form.Item>

            <Form.Item label="价格上限 (USDT)">
              <InputNumber
                value={config.upperPrice}
                onChange={(v) => setConfig({ ...config, upperPrice: v })}
                min={0.01}
                step={0.01}
                style={{ width: '100%' }}
                disabled={!isEditing || bot.isRunning}
              />
            </Form.Item>

            <Form.Item label="网格类型">
              <Select
                value={config.gridType || 'arithmetic'}
                onChange={(v) => setConfig({ ...config, gridType: v })}
                disabled={!isEditing || bot.isRunning}
                style={{ width: '100%' }}
              >
                <Select.Option value="arithmetic">等差网格</Select.Option>
                <Select.Option value="geometric">等比网格</Select.Option>
              </Select>
            </Form.Item>
          </Space>
        )
      
      default:
        return null
    }
  }

  // 获取策略名称
  const getStrategyName = (type) => {
    const names = {
      buysell: '低买高卖',
      dca: '定投策略 (DCA)',
      grid: '网格策略 (Grid)'
    }
    return names[type] || type
  }

  return (
    <Card
      title={
        <Space>
          <span>{bot.name || getStrategyName(bot.type)}</span>
          <Tag color={bot.isRunning ? 'green' : 'default'}>
            {bot.isRunning ? '运行中' : '已停止'}
          </Tag>
          {bot.isRunning && <ThunderboltFilled style={{ color: '#52c41a' }} />}
        </Space>
      }
      extra={
        <Space>
          <Switch
            checked={bot.isRunning}
            onChange={() => onToggle(bot.id)}
            checkedChildren="运行"
            unCheckedChildren="停止"
          />
        </Space>
      }
      style={{
        borderColor: bot.isRunning ? '#52c41a' : undefined,
        borderWidth: bot.isRunning ? 2 : 1
      }}
    >
      {bot.isRunning && (
        <Alert
          message="机器人运行中，无法修改配置"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Collapse defaultActiveKey={['config']} ghost>
        <Panel header="策略配置" key="config">
          <Form layout="vertical">
            {renderConfig()}
          </Form>

          <Space style={{ marginTop: 16 }}>
            {!isEditing ? (
              <Button
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
                disabled={bot.isRunning}
              >
                编辑配置
              </Button>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                >
                  保存
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                >
                  取消
                </Button>
              </>
            )}
            
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(bot.id)}
              disabled={bot.isRunning}
            >
              删除
            </Button>
          </Space>
        </Panel>

        <Panel header="运行统计" key="stats">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>总交易次数: {bot.stats?.totalTrades || 0}</div>
            <div>成功次数: {bot.stats?.successTrades || 0}</div>
            <div>失败次数: {bot.stats?.failedTrades || 0}</div>
            <div>总交易额: {(bot.stats?.totalVolume || 0).toFixed(2)} USDT</div>
            <div>运行时长: {formatRuntime(bot.stats?.runningTime || 0)}</div>
          </Space>
        </Panel>
      </Collapse>
    </Card>
  )
}

// 格式化运行时间
function formatRuntime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}小时 ${m}分钟 ${s}秒`
}
