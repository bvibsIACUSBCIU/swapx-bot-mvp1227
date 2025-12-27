import { Card, Form, InputNumber, Select, Space, Typography } from 'antd'
import { SettingOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

/**
 * 策略配置组件
 * 根据选择的策略类型显示不同的配置项
 */
export default function StrategyConfig({ strategyType, config, onChange, disabled }) {
  const handleChange = (field, value) => {
    onChange({ ...config, [field]: value })
  }

  // 低买高卖策略配置
  const renderBuySellConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="买入阈值 (USDT)">
        <InputNumber
          value={config.buyThreshold}
          onChange={(v) => handleChange('buyThreshold', v)}
          min={0.01}
          max={1}
          step={0.001}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="低于此价格时买入"
        />
      </Form.Item>
      
      <Form.Item label="卖出阈值 (USDT)">
        <InputNumber
          value={config.sellThreshold}
          onChange={(v) => handleChange('sellThreshold', v)}
          min={0.01}
          max={1}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
          placeholder="高于此价格时卖出"
        />
      </Form.Item>

      <Form.Item label="交易金额 (USDT)">
        <InputNumber
          value={config.tradeAmount}
          onChange={(v) => handleChange('tradeAmount', v)}
          min={0.1}
          max={1000}
          step={0.1}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item label="检查间隔">
        <Select
          value={config.checkInterval}
          onChange={(v) => handleChange('checkInterval', v)}
          disabled={disabled}
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

  // 定投策略配置
  const renderDCAConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="买入金额 (USDT)">
        <InputNumber
          value={config.amount}
          onChange={(v) => handleChange('amount', v)}
          min={1}
          max={10000}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>
      
      <Form.Item label="执行间隔">
        <Select
          value={config.interval}
          onChange={(v) => handleChange('interval', v)}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          <Select.Option value={60}>每分钟</Select.Option>
          <Select.Option value={300}>每5分钟</Select.Option>
          <Select.Option value={600}>每10分钟</Select.Option>
          <Select.Option value={3600}>每小时</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="总次数">
        <InputNumber
          value={config.totalTimes}
          onChange={(v) => handleChange('totalTimes', v)}
          min={1}
          max={100}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>
    </Space>
  )

  // 网格策略配置
  const renderGridConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="网格数量">
        <InputNumber
          value={config.gridCount}
          onChange={(v) => handleChange('gridCount', v)}
          min={2}
          max={20}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item label="价格下限 (USDT)">
        <InputNumber
          value={config.lowerPrice}
          onChange={(v) => handleChange('lowerPrice', v)}
          min={0.01}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item label="价格上限 (USDT)">
        <InputNumber
          value={config.upperPrice}
          onChange={(v) => handleChange('upperPrice', v)}
          min={0.01}
          step={0.01}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item label="单网格金额 (USDT)">
        <InputNumber
          value={config.amountPerGrid}
          onChange={(v) => handleChange('amountPerGrid', v)}
          min={1}
          max={1000}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Form.Item>
    </Space>
  )

  return (
    <Card 
      title={
        <Space>
          <SettingOutlined />
          <span>策略参数</span>
        </Space>
      }
    >
      {!strategyType ? (
        <Text type="secondary">请先选择策略</Text>
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
