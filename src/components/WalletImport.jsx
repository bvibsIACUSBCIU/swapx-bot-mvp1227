import { useState } from 'react'
import { Card, Input, Button, Alert, Space, Typography } from 'antd'
import { WalletOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { ethers } from 'ethers'
import { saveWallet, getWallet, removeWallet } from '../utils/storage'

const { Title, Text } = Typography

/**
 * 钱包导入组件
 * 功能：导入私钥、显示钱包地址、保存到localStorage
 */
export default function WalletImport({ onWalletImported }) {
  const [privateKey, setPrivateKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [wallet, setWallet] = useState(getWallet())

  // 导入钱包
  const handleImport = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 验证私钥格式（支持带或不带0x前缀）
      let formattedKey = privateKey.trim()
      if (!formattedKey.startsWith('0x')) {
        formattedKey = '0x' + formattedKey
      }
      
      // 验证私钥长度（应为66字符：0x + 64位十六进制）
      if (formattedKey.length !== 66) {
        throw new Error('私钥格式错误，应为64位十六进制字符')
      }
      
      // 创建钱包实例
      const walletInstance = new ethers.Wallet(formattedKey)
      const address = walletInstance.address
      
      // 保存到localStorage
      const walletData = {
        address,
        privateKey: formattedKey,
        importedAt: new Date().toISOString()
      }
      saveWallet(walletData)
      setWallet(walletData)
      
      // 通知父组件
      if (onWalletImported) {
        onWalletImported(walletData)
      }
      
      setPrivateKey('') // 清空输入框
    } catch (err) {
      setError(err.message || '导入失败，请检查私钥格式')
    } finally {
      setLoading(false)
    }
  }

  // 清除钱包
  const handleClear = () => {
    // 清除localStorage（使用统一的storage工具）
    removeWallet()
    // 重置本地状态
    setWallet(null)
    setPrivateKey('')
    setError('')
    // 通知父组件钱包已断开
    if (onWalletImported) {
      onWalletImported(null)
    }
  }

  return (
    <Card 
      title={
        <Space>
          <WalletOutlined />
          <span>钱包管理</span>
        </Space>
      }
    >
      {wallet ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="钱包已连接"
            description={
              <div>
                <Text strong>地址：</Text>
                <Text copyable>{wallet.address}</Text>
              </div>
            }
            type="success"
            showIcon
          />
          <Button danger onClick={handleClear}>
            断开钱包
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5}>导入私钥</Title>
          <Input.Password
            placeholder="请输入私钥（64位十六进制，可选0x前缀）"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            visibilityToggle={{ visible: showKey, onVisibleChange: setShowKey }}
          />
          {error && <Alert message={error} type="error" showIcon />}
          <Button 
            type="primary" 
            onClick={handleImport}
            loading={loading}
            disabled={!privateKey}
            block
          >
            导入钱包
          </Button>
          <Alert
            message="安全提示"
            description="私钥仅保存在本地浏览器，请妥善保管。建议仅使用测试钱包。"
            type="warning"
            showIcon
          />
        </Space>
      )}
    </Card>
  )
}
