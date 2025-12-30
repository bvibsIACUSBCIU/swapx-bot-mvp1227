import { Card, Form, InputNumber, Select, Space, Typography, Radio, Tooltip } from 'antd'
import { SettingOutlined, InfoCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

/**
 * 策略配置组件
 * 适配新的 DCA 和 Grid 策略参数
 */
export default function StrategyConfig({ strategyType, config, onChange, disabled }) {
  const handleChange = (field, value) => {
    onChange({ ...config, [field]: value })
  }

  // 辅助：时间单位转换器
  const handleIntervalChange = (value, unit) => {
    // 基础单位是秒
    let multiplier = 1
    if (unit === 'minute') multiplier = 60
    if (unit === 'hour') multiplier = 3600
    if (unit === 'day') multiplier = 86400
    
    // 我们假设UI传入的值就是秒，或者我们需要一个复合控件。
    // 为了简化，这里直接提供几个常用预设，或者允许用户输入秒数
    handleChange('interval', value * multiplier)
  }

  // 低买高卖策略配置 (保持不变，或根据需要微调)
  const renderBuySellConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="买入阈值 (USDT)">
        <InputNumber
          value={config.buyThreshold}
          onChange={(v) => handleChange('buyThreshold', v)}
          min={0.01}
          max={100}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="低于此价买入"
        />
      </Form.Item>
      
      <Form.Item label="卖出阈值 (USDT)">
        <InputNumber
          value={config.sellThreshold}
          onChange={(v) => handleChange('sellThreshold', v)}
          min={0.01}
          max={100}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="高于此价卖出"
        />
      </Form.Item>

      <Form.Item label="单次交易额 (USDT)">
        <InputNumber
          value={config.tradeAmount}
          onChange={(v) => handleChange('tradeAmount', v)}
          min={1}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>
    </Space>
  )

  // 定投策略配置 - 优化版
  const renderDCAConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="单次定投金额 (USDT)">
        <InputNumber
          value={config.amount}
          onChange={(v) => handleChange('amount', v)}
          min={1}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="每次买入多少U"
        />
      </Form.Item>

      <Form.Item label="总预算上限 (USDT)" tooltip="当总投入达到此金额时停止策略">
        <InputNumber
          value={config.totalBudget}
          onChange={(v) => handleChange('totalBudget', v)}
          min={10}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="计划总共投入多少U"
        />
      </Form.Item>
      
      <Form.Item label="定投周期">
        <Select
          value={config.interval}
          onChange={(v) => handleChange('interval', v)}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          <Select.Option value={60}>每1分钟</Select.Option>
          <Select.Option value={300}>每5分钟</Select.Option>
          <Select.Option value={3600}>每1小时</Select.Option>
          <Select.Option value={14400}>每4小时</Select.Option>
          <Select.Option value={86400}>每天</Select.Option>
          <Select.Option value={604800}>每周</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="价格保护 (可选)" tooltip="如果当前价格高于此值，暂停买入">
        <InputNumber
          value={config.maxPrice}
          onChange={(v) => handleChange('maxPrice', v)}
          min={0}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="价格高于多少暂停定投 (留空不限制)"
        />
      </Form.Item>
    </Space>
  )

  // 网格策略配置 - 优化版
  const renderGridConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
       <Form.Item label="总投入资金 (USDT)">
        <InputNumber
          value={config.totalInvestment}
          onChange={(v) => handleChange('totalInvestment', v)}
          min={10}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="网格策略总共使用的资金"
        />
      </Form.Item>

      <Form.Item label="价格区间 (USDT)">
        <Space.Compact block>
            <InputNumber
            style={{ width: '50%' }}
            placeholder="最低价"
            value={config.lowerPrice}
            onChange={(v) => handleChange('lowerPrice', v)}
            disabled={disabled}
            />
            <InputNumber
            style={{ width: '50%' }}
            placeholder="最高价"
            value={config.upperPrice}
            onChange={(v) => handleChange('upperPrice', v)}
            disabled={disabled}
            />
        </Space.Compact>
      </Form.Item>

      <Form.Item label="网格数量">
        <InputNumber
          value={config.gridCount}
          onChange={(v) => handleChange('gridCount', v)}
          min={2}
          max={50}
          precision={0}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item label="网格类型">
        <Radio.Group 
            value={config.gridType || 'arithmetic'} 
            onChange={(e) => handleChange('gridType', e.target.value)}
            disabled={disabled}
            style={{ width: '100%' }}
        >
            <Radio.Button value="arithmetic" style={{ width: '50%', textAlign: 'center' }}>等差网格</Radio.Button>
            <Radio.Button value="geometric" style={{ width: '50%', textAlign: 'center' }}>等比网格</Radio.Button>
        </Radio.Group>
        <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
            {config.gridType === 'geometric' ? '适合大区间震荡，每格盈亏比例一致' : '适合小区间震荡，每格价差一致'}
        </div>
      </Form.Item>
    </Space>
  )

  return (
    <Card 
      title={
        <Space>
          <SettingOutlined />
          <span>策略参数配置</span>
        </Space>
      }
      bodyStyle={{ padding: '24px' }}
    >
      {!strategyType ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
            <InfoCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>请在左侧选择一种交易策略</div>
        </div>
      ) : (
        <Form layout="vertical">
          {strategyType === 'buysell' && renderBuySellConfig()}
          {strategyType === 'dca' && renderDCAConfig()}
          {strategyType === 'grid' && renderGridConfig()}
        </Form>
      )}
    </Card>
  )
}