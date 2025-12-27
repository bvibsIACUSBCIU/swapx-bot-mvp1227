import { useEffect, useRef, useState } from 'react'
import { Card, List, Tag, Button, Space, Radio } from 'antd'
import { FileTextOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getLogs, clearLogs, LOG_TYPES } from '../utils/logger'

/**
 * 日志显示组件
 * 功能：实时显示交易日志和系统日志、导出日志、清空日志
 */
export default function LogDisplay() {
  const [logs, setLogs] = useState([])
  const [logType, setLogType] = useState('all') // 'all' | 'trade' | 'system'
  const listRef = useRef(null)

  // 加载历史日志
  useEffect(() => {
    const storedLogs = getLogs(logType)
    setLogs(storedLogs)
  }, [logType])

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [logs])

  // 定时刷新日志（模拟实时更新）
  useEffect(() => {
    const timer = setInterval(() => {
      const latestLogs = getLogs(logType)
      setLogs(latestLogs)
    }, 2000)
    return () => clearInterval(timer)
  }, [logType])

  // 清空日志
  const handleClear = () => {
    clearLogs(logType)
    setLogs([])
  }

  // 导出日志
  const handleExport = () => {
    const logText = logs
      .map(log => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swapx-bot-logs-${dayjs().format('YYYYMMDD-HHmmss')}.txt`
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

  // 日志类型颜色
  const getTypeColor = (type) => {
    return type === LOG_TYPES.TRADE ? 'gold' : 'cyan'
  }

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          <span>运行日志</span>
          <Tag>{logs.length} 条</Tag>
        </Space>
      }
      extra={
        <Space>
          <Radio.Group 
            size="small" 
            value={logType} 
            onChange={(e) => setLogType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button value="trade">交易</Radio.Button>
            <Radio.Button value="system">系统</Radio.Button>
          </Radio.Group>
          <Button 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            导出
          </Button>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={logs.length === 0}
          >
            清空
          </Button>
        </Space>
      }
    >
      <div 
        ref={listRef}
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
                <Space size="small">
                  <span style={{ color: '#999', fontSize: '12px' }}>
                    {dayjs(log.timestamp).format('HH:mm:ss')}
                  </span>
                  {log.type && (
                    <Tag color={getTypeColor(log.type)} style={{ fontSize: '10px', padding: '0 4px' }}>
                      {log.type === LOG_TYPES.TRADE ? '交易' : '系统'}
                    </Tag>
                  )}
                  <Tag color={getLevelColor(log.level)} style={{ fontSize: '11px' }}>
                    {log.level.toUpperCase()}
                  </Tag>
                  <span style={{ fontSize: '13px' }}>{log.message}</span>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  )
}
