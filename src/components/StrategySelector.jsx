import { Card, Typography, Space, Radio } from 'antd'
import { RiseOutlined, AppstoreOutlined, SwapOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

/**
 * 策略选择组件
 * 支持：低买高卖、定投策略(DCA)、网格策略(Grid)
 */
export default function StrategySelector({ value, onChange, disabled }) {
  const strategies = [
    {
      value: 'buysell',
      label: '低买高卖',
      icon: <SwapOutlined />,
      description: '价格低于阈值买入，高于阈值卖出'
    },
    {
      value: 'dca',
      label: '定投策略 (DCA)',
      icon: <RiseOutlined />,
      description: '定时定额买入，适合长期持有'
    },
    {
      value: 'grid',
      label: '网格策略 (Grid)',
      icon: <AppstoreOutlined />,
      description: '设置价格区间，高抛低吸赚差价'
    }
  ]

  return (
    <Card title="选择策略">
      <Space direction="vertical" style={{ width: '100%' }}>
        {strategies.map(strategy => (
          <Card 
            key={strategy.value}
            hoverable={!disabled}
            style={{ 
              cursor: disabled ? 'not-allowed' : 'pointer',
              borderColor: value === strategy.value ? '#1890ff' : undefined,
              borderWidth: value === strategy.value ? 2 : 1,
              opacity: disabled ? 0.6 : 1
            }}
            onClick={() => !disabled && onChange(strategy.value)}
          >
            <Space>
              <Radio checked={value === strategy.value} disabled={disabled} />
              {strategy.icon}
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {strategy.label}
                </Title>
                <Paragraph 
                  type="secondary" 
                  style={{ margin: 0, fontSize: '12px' }}
                >
                  {strategy.description}
                </Paragraph>
              </div>
            </Space>
          </Card>
        ))}
      </Space>
    </Card>
  )
}
