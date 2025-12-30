import { useEffect, useRef, useState } from 'react'
import { Card, List, Tag, Button, Space, Row, Col } from 'antd'
import { FileTextOutlined, ClearOutlined, DownloadOutlined, DollarOutlined, SettingOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getLogs, clearLogs, LOG_TYPES } from '../utils/logger'

/**
 * 日志显示组件 - 上下布局
 * 上方：系统日志，下方：交易日志
 */
export default function LogDisplay() {
  const [tradeLogs, setTradeLogs] = useState([])
  const [systemLogs, setSystemLogs] = useState([])

  // 加载历史日志
  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = () => {
    const trade = getLogs('trade')
    const system = getLogs('system')
    setTradeLogs(trade)
    setSystemLogs(system)
  }

  // 定时刷新日志（模拟实时更新）
  useEffect(() => {
    const timer = setInterval(() => {
      loadLogs()
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  // 清空交易日志
  const handleClearTrade = () => {
    clearLogs('trade')
    setTradeLogs([])
  }

  // 清空系统日志
  const handleClearSystem = () => {
    clearLogs('system')
    setSystemLogs([])
  }

  // 导出交易日志
  const handleExportTrade = () => {
    const logText = tradeLogs
      .map(log => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swapx-trade-logs-${dayjs().format('YYYYMMDD-HHmmss')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导出系统日志
  const handleExportSystem = () => {
    const logText = systemLogs
      .map(log => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swapx-system-logs-${dayjs().format('YYYYMMDD-HHmmss')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 日志级别颜色
  const getLevelColor = (level) => {
    const colors = {
      info: 'blue',
      success: 'green',
      warning: 'orange',
      error: 'red',
      debug: 'purple'
    }
    return colors[level] || 'default'
  }

  // 渲染日志列表
  const renderLogList = (logs) => (
    <div 
      style={{ 
        height: 400, 
        overflowY: 'auto',
        backgroundColor: '#f5f5f5',
        padding: '12px',
        borderRadius: '4px'
      }}
    >
      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
          暂无日志记录
        </div>
      ) : (
        <List
          dataSource={logs}
          renderItem={(log) => (
            <List.Item style={{ padding: '4px 0', border: 'none' }}>
              <Space size="small" style={{ width: '100%' }}>
                <span style={{ color: '#999', fontSize: '12px', minWidth: '60px' }}>
                  {dayjs(log.timestamp).format('HH:mm:ss')}
                </span>
                <Tag color={getLevelColor(log.level)} style={{ fontSize: '11px' }}>
                  {log.level.toUpperCase()}
                </Tag>
                <span style={{ fontSize: '13px', flex: 1, wordBreak: 'break-word' }}>
                  {log.message}
                </span>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 系统日志 */}
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>系统日志</span>
            <Tag color="cyan">{systemLogs.length} 条</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={handleExportSystem}
              disabled={systemLogs.length === 0}
            >
              导出
            </Button>
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={handleClearSystem}
              disabled={systemLogs.length === 0}
            >
              清空
            </Button>
          </Space>
        }
      >
        {renderLogList(systemLogs)}
      </Card>

      {/* 交易日志 */}
      <Card 
        title={
          <Space>
            <DollarOutlined />
            <span>交易日志</span>
            <Tag color="gold">{tradeLogs.length} 条</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={handleExportTrade}
              disabled={tradeLogs.length === 0}
            >
              导出
            </Button>
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={handleClearTrade}
              disabled={tradeLogs.length === 0}
            >
              清空
            </Button>
          </Space>
        }
      >
        {renderLogList(tradeLogs)}
      </Card>
    </div>
  )
}
