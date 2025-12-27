import { useState, useEffect } from 'react'
import { Layout, Menu, Typography, ConfigProvider, theme } from 'antd'
import {
  DashboardOutlined,
  RobotOutlined,
  SwapOutlined,
  BarChartOutlined,
  ThunderboltFilled
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'

// 导入组件
import Dashboard from './components/Dashboard'
import BotManager from './components/BotManager'
import ManualTrade from './components/ManualTrade'
import LogDisplay from './components/LogDisplay'
import { getWallet } from './utils/storage'

const { Header, Sider, Content } = Layout
const { Title } = Typography

/**
 * SwapX Trading Bot 主应用 v2.0
 * 重构架构：多机器人独立运行、手动交易、统一Dashboard
 */
function App() {
  // 状态管理
  const [wallet, setWallet] = useState(null)
  const [selectedMenu, setSelectedMenu] = useState('dashboard')

  // 从localStorage加载钱包
  useEffect(() => {
    const savedWallet = getWallet()
    if (savedWallet) {
      setWallet(savedWallet)
    }
  }, [])

  // 菜单项配置
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'bots',
      icon: <RobotOutlined />,
      label: '策略机器人'
    },
    {
      key: 'manual-trade',
      icon: <SwapOutlined />,
      label: '手动交易'
    },
    {
      key: 'logs',
      icon: <BarChartOutlined />,
      label: '运行日志'
    }
  ]

  // 处理钱包导入/断开
  const handleWalletImported = (walletData) => {
    setWallet(walletData)
  }

  // 渲染内容区域
  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return <Dashboard wallet={wallet} onWalletImported={handleWalletImported} />
      
      case 'bots':
        return <BotManager wallet={wallet} />
      
      case 'manual-trade':
        return <ManualTrade wallet={wallet} />
      
      case 'logs':
        return <LogDisplay />
      
      default:
        return <Dashboard wallet={wallet} onWalletImported={handleWalletImported} />
    }
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 顶部标题栏 */}
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#001529',
            padding: '0 24px',
          }}
        >
          <RobotOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            SwapX Trading Bot v2.0
          </Title>
          {wallet && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <ThunderboltFilled style={{ color: '#52c41a' }} />
              <span style={{ color: '#1890ff' }}>
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
            </div>
          )}
        </Header>

        <Layout>
          {/* 左侧边栏 */}
          <Sider
            width={200}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0'
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              onClick={({ key }) => setSelectedMenu(key)}
              items={menuItems}
              style={{ height: '100%', borderRight: 0 }}
            />
          </Sider>

          {/* 内容区 */}
          <Layout style={{ padding: '24px' }}>
            <Content
              style={{
                background: '#fff',
                padding: 24,
                margin: 0,
                minHeight: 280,
                borderRadius: 8,
              }}
            >
              {renderContent()}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
