import { useState, useEffect } from 'react'
import { Card, InputNumber, Button, Select, Space, Alert, Statistic, Row, Col, Radio, Spin } from 'antd'
import { SwapOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons'
import { createProvider, createWallet } from '../services/wallet'
import { getWXOCPrice, executeSwap, waitForTransaction } from '../services/swap'
import { log, tradeLog } from '../utils/logger'

/**
 * ManualTrade - 手动交易页面
 * 支持手动买卖WXOC/USDT
 */
export default function ManualTrade({ wallet }) {
  const [tradeType, setTradeType] = useState('buy') // 'buy' or 'sell'
  const [amount, setAmount] = useState(1)
  const [price, setPrice] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [trading, setTrading] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [estimatedOutput, setEstimatedOutput] = useState(0)

  // 自动获取价格
  useEffect(() => {
    if (wallet) {
      fetchPrice()
      const interval = setInterval(fetchPrice, 10000) // 每10秒更新价格
      return () => clearInterval(interval)
    }
  }, [wallet])

  // 计算预估输出
  useEffect(() => {
    if (amount && price) {
      if (tradeType === 'buy') {
        setEstimatedOutput(amount / price)
      } else {
        setEstimatedOutput(amount * price)
      }
    }
  }, [amount, price, tradeType])

  // 获取当前价格
  const fetchPrice = async () => {
    if (!wallet) return
    
    setLoadingPrice(true)
    try {
      const provider = createProvider('xoc')
      const currentPrice = await getWXOCPrice(provider)
      setPrice(currentPrice)
      // 价格更新静默，不输出日志
    } catch (error) {
      log.error('获取价格失败', error)
    } finally {
      setLoadingPrice(false)
    }
  }

  // 执行交易
  const handleTrade = async () => {
    if (!wallet || !amount || amount <= 0) {
      log.error('参数无效', { wallet, amount })
      return
    }

    setTrading(true)
    
    try {
      const provider = createProvider('xoc')
      const walletInstance = createWallet(wallet.privateKey, provider)
      
      tradeLog.info(`开始${tradeType === 'buy' ? '买入' : '卖出'}交易`, { amount, price })
      
      let result
      if (tradeType === 'buy') {
        // 买入：用USDT买WXOC
        result = await executeSwap(walletInstance, 'USDT', 'WXOC', amount, slippage)
      } else {
        // 卖出：用WXOC换USDT
        result = await executeSwap(walletInstance, 'WXOC', 'USDT', amount, slippage)
      }
      
      // 等待交易确认
      const receipt = await waitForTransaction(result.hash, provider)
      
      tradeLog.success(`${tradeType === 'buy' ? '买入' : '卖出'}成功！`, receipt)
      
      // 保存交易记录
      saveTradeRecord({
        type: tradeType === 'buy' ? 'BUY' : 'SELL',
        amountUSDT: tradeType === 'buy' ? amount : estimatedOutput,
        amountWXOC: tradeType === 'buy' ? estimatedOutput : amount,
        price,
        txHash: receipt.hash,
        timestamp: new Date().toISOString(),
        status: 'success'
      })
      
      // 重置表单
      setAmount(1)
      
    } catch (error) {
      tradeLog.error('交易失败', error)
      alert(`交易失败: ${error.message}`)
    } finally {
      setTrading(false)
    }
  }

  // 保存交易记录
  const saveTradeRecord = (trade) => {
    try {
      const trades = JSON.parse(localStorage.getItem('swapx_trades') || '[]')
      trades.push(trade)
      localStorage.setItem('swapx_trades', JSON.stringify(trades))
    } catch (error) {
      console.error('保存交易记录失败', error)
    }
  }

  if (!wallet) {
    return (
      <Alert
        message="请先连接钱包"
        description="需要先在Dashboard页面导入钱包才能进行手动交易"
        type="warning"
        showIcon
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title={<><SwapOutlined /> 手动交易</>}>
        {/* 当前价格 */}
        <Card 
          type="inner" 
          title="当前市场价格"
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchPrice}
              loading={loadingPrice}
              size="small"
            >
              刷新
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Spin spinning={loadingPrice}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="WXOC/USDT"
                  value={price}
                  precision={6}
                  valueStyle={{ color: '#1890ff', fontSize: '32px' }}
                  suffix="USDT"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="USDT/WXOC"
                  value={price > 0 ? 1 / price : 0}
                  precision={2}
                  valueStyle={{ fontSize: '24px' }}
                  suffix="WXOC"
                />
              </Col>
            </Row>
          </Spin>
        </Card>

        {/* 交易类型选择 */}
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label style={{ marginBottom: 8, display: 'block', fontWeight: 'bold' }}>
              交易类型
            </label>
            <Radio.Group 
              value={tradeType} 
              onChange={(e) => setTradeType(e.target.value)}
              buttonStyle="solid"
              size="large"
              style={{ width: '100%' }}
            >
              <Radio.Button value="buy" style={{ width: '50%', textAlign: 'center' }}>
                买入 WXOC
              </Radio.Button>
              <Radio.Button value="sell" style={{ width: '50%', textAlign: 'center' }}>
                卖出 WXOC
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* 交易金额 */}
          <div>
            <label style={{ marginBottom: 8, display: 'block', fontWeight: 'bold' }}>
              {tradeType === 'buy' ? '支付金额 (USDT)' : '卖出数量 (WXOC)'}
            </label>
            <InputNumber
              value={amount}
              onChange={setAmount}
              min={0.1}
              max={10000}
              step={0.1}
              style={{ width: '100%' }}
              size="large"
              disabled={trading}
            />
          </div>

          {/* 滑点设置 */}
          <div>
            <label style={{ marginBottom: 8, display: 'block', fontWeight: 'bold' }}>
              滑点容忍度
            </label>
            <Select
              value={slippage}
              onChange={setSlippage}
              style={{ width: '100%' }}
              size="large"
              disabled={trading}
            >
              <Select.Option value={0.1}>0.1%</Select.Option>
              <Select.Option value={0.5}>0.5%</Select.Option>
              <Select.Option value={1}>1%</Select.Option>
              <Select.Option value={2}>2%</Select.Option>
              <Select.Option value={5}>5%</Select.Option>
            </Select>
          </div>

          {/* 交易预览 */}
          <Card type="inner" title="交易预览">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '18px'
              }}>
                <span>
                  {tradeType === 'buy' ? `${amount} USDT` : `${amount} WXOC`}
                </span>
                <ArrowRightOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {tradeType === 'buy' 
                    ? `≈ ${estimatedOutput.toFixed(4)} WXOC`
                    : `≈ ${estimatedOutput.toFixed(2)} USDT`
                  }
                </span>
              </div>
              <div style={{ color: '#888', fontSize: '12px' }}>
                * 预估输出，实际金额受市场波动和滑点影响
              </div>
            </Space>
          </Card>

          {/* 执行按钮 */}
          <Button
            type="primary"
            size="large"
            block
            onClick={handleTrade}
            loading={trading}
            disabled={!amount || amount <= 0 || price === 0}
          >
            {trading ? '交易执行中...' : `确认${tradeType === 'buy' ? '买入' : '卖出'}`}
          </Button>

          <Alert
            message="交易提示"
            description="请确认交易金额和滑点设置。交易将消耗XOC作为Gas费，请确保钱包有足够余额。"
            type="info"
            showIcon
          />
        </Space>
      </Card>
    </div>
  )
}
