import { useState, useEffect } from 'react'
import { Layout, Menu, Typography, ConfigProvider, theme, Button, Modal, message } from 'antd'
import {
  DashboardOutlined,
  RobotOutlined,
  SwapOutlined,
  BarChartOutlined,
  ThunderboltFilled,
  DeleteOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'

// 导入组件
import Dashboard from './components/Dashboard'
import BotManager from './components/BotManager'
import ManualTrade from './components/ManualTrade'
import LogDisplay from './components/LogDisplay'
import { getWallet, clearAllStorage } from './utils/storage'

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  // 小屏幕默认折叠侧边栏
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768)

  // 从localStorage加载钱包
  useEffect(() => {
    const savedWallet = getWallet()
    if (savedWallet) {
      setWallet(savedWallet)
    }
  }, [])

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && !collapsed) {
        setCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [collapsed])

  // 菜单项配置
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制面板'
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

  // 处理清除所有数据
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
          {!isMobile && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                color: '#fff',
                marginRight: '16px',
              }}
            />
          )}
          <RobotOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
          <Title level={3} style={{ color: 'white', margin: 0, fontSize: isMobile ? '18px' : '24px' }}>
            SwapX Trading Bot {!isMobile && 'v2.0'}
          </Title>
          {wallet && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <ThunderboltFilled style={{ color: '#52c41a' }} />
              <span style={{ color: '#1890ff' }}>
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
              <Button 
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleClearAllData}
              >
                {!isMobile && '清除数据'}
              </Button>
            </div>
          )}
        </Header>

        <Layout style={{ position: 'relative' }}>
          {/* 桌面端侧边栏 */}
          {!isMobile && (
            <Sider
              collapsible
              collapsed={collapsed}
              onCollapse={(value) => setCollapsed(value)}
              trigger={null}
              collapsedWidth={0}
              breakpoint="md"
              width={200}
              style={{
                background: '#fff',
                borderRight: collapsed ? 'none' : '1px solid #f0f0f0',
                overflow: 'hidden',
                transition: 'all 0.2s'
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
          )}

          {/* 内容区 */}
          <Layout style={{ padding: isMobile ? '12px' : '24px', paddingBottom: isMobile ? '68px' : '24px' }}>
            <Content
              style={{
                background: '#fff',
                padding: isMobile ? 12 : 24,
                margin: 0,
                minHeight: 280,
                borderRadius: 8,
              }}
            >
              {renderContent()}
            </Content>
          </Layout>
        </Layout>

        {/* 移动端底部导航栏 */}
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderTop: '1px solid #f0f0f0',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
              zIndex: 999,
            }}
          >
            <Menu
              mode="horizontal"
              selectedKeys={[selectedMenu]}
              onClick={({ key }) => setSelectedMenu(key)}
              items={menuItems.map(item => ({
                ...item,
                label: null, // 移动端不显示文字
              }))}
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                borderBottom: 'none',
                lineHeight: '48px',
              }}
            />
          </div>
        )}
      </Layout>
    </ConfigProvider>
  )
}

export default App
