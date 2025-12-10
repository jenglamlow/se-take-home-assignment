import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

type OrderType = 'normal' | 'vip'
type OrderStatus = 'pending' | 'processing' | 'complete'

interface Order {
  id: number
  type: OrderType
  status: OrderStatus
  name: string
  botId?: number
}

interface Bot {
  id: number
  orderId: number | null
  startTime: number | null
}

const PROCESSING_TIME = 10000 // 10 seconds

const MENU_ITEMS = [
  'Big Mac',
  'McChicken',
  'Filet-O-Fish',
  'McNuggets',
  'McFlurry',
  'French Fries',
  'Double Cheeseburger',
  'Apple Pie'
]

const generateOrderName = (id: number, type: OrderType): string => {
  const base = MENU_ITEMS[(id - 1) % MENU_ITEMS.length]
  return type === 'vip' ? `${base} (VIP)` : base
}

function App() {
  const [orders, setOrders] = useState<Order[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [nextOrderId, setNextOrderId] = useState(1)
  const [nextBotId, setNextBotId] = useState(1)
  
  // Use refs to access current state in intervals
  const ordersRef = useRef(orders)
  const botsRef = useRef(bots)
  
  useEffect(() => {
    ordersRef.current = orders
  }, [orders])
  
  useEffect(() => {
    botsRef.current = bots
  }, [bots])

  // Add a new order
  const addOrder = useCallback((type: OrderType) => {
    const newOrder: Order = {
      id: nextOrderId,
      type,
      status: 'pending',
      name: generateOrderName(nextOrderId, type)
    }
    
    setOrders(prevOrders => {
      if (type === 'vip') {
        // Find the position after the last VIP order
        const lastVipIndex = prevOrders.reduce((lastIndex, order, index) => {
          if (order.type === 'vip' && order.status === 'pending') {
            return index
          }
          return lastIndex
        }, -1)
        
        // Insert after last VIP order (or at the beginning if no VIP orders)
        const insertIndex = lastVipIndex + 1
        return [
          ...prevOrders.slice(0, insertIndex),
          newOrder,
          ...prevOrders.slice(insertIndex)
        ]
      }
      return [...prevOrders, newOrder]
    })
    
    setNextOrderId(prev => prev + 1)
  }, [nextOrderId])

  // Add a new bot
  const addBot = useCallback(() => {
    const newBot: Bot = {
      id: nextBotId,
      orderId: null,
      startTime: null
    }
    setBots(prev => [...prev, newBot])
    setNextBotId(prev => prev + 1)
  }, [nextBotId])

  // Remove the newest bot
  const removeBot = useCallback(() => {
    setBots(prevBots => {
      if (prevBots.length === 0) return prevBots
      
      const newestBot = prevBots[prevBots.length - 1]
      
      // If the bot was processing an order, return it to pending
      if (newestBot.orderId !== null) {
        setOrders(prevOrders => {
          return prevOrders.map(order => {
            if (order.id === newestBot.orderId) {
              return { ...order, status: 'pending' as OrderStatus, botId: undefined }
            }
            return order
          }).sort((a, b) => {
            // Re-sort to maintain VIP priority
            if (a.status !== 'pending' || b.status !== 'pending') return 0
            if (a.type === 'vip' && b.type !== 'vip') return -1
            if (a.type !== 'vip' && b.type === 'vip') return 1
            return a.id - b.id
          })
        })
      }
      
      return prevBots.slice(0, -1)
    })
  }, [])

  // Process orders with bots
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOrders = ordersRef.current
      const currentBots = botsRef.current
      
      let ordersUpdated = false
      let botsUpdated = false
      
      const newOrders = [...currentOrders]
      const newBots = [...currentBots]
      
      // Check for completed orders
      newBots.forEach((bot, botIndex) => {
        if (bot.orderId !== null && bot.startTime !== null) {
          const elapsed = Date.now() - bot.startTime
          if (elapsed >= PROCESSING_TIME) {
            // Mark order as complete
            const orderIndex = newOrders.findIndex(o => o.id === bot.orderId)
            if (orderIndex !== -1) {
              newOrders[orderIndex] = { ...newOrders[orderIndex], status: 'complete', botId: undefined }
              ordersUpdated = true
            }
            // Free up the bot
            newBots[botIndex] = { ...bot, orderId: null, startTime: null }
            botsUpdated = true
          }
        }
      })
      
      // Assign idle bots to pending orders
      newBots.forEach((bot, botIndex) => {
        if (bot.orderId === null) {
          // Find next pending order (VIP orders are already at the front)
          const pendingOrderIndex = newOrders.findIndex(o => o.status === 'pending')
          if (pendingOrderIndex !== -1) {
            newOrders[pendingOrderIndex] = { 
              ...newOrders[pendingOrderIndex], 
              status: 'processing',
              botId: bot.id 
            }
            newBots[botIndex] = { 
              ...bot, 
              orderId: newOrders[pendingOrderIndex].id, 
              startTime: Date.now() 
            }
            ordersUpdated = true
            botsUpdated = true
          }
        }
      })
      
      if (ordersUpdated) {
        setOrders(newOrders)
      }
      if (botsUpdated) {
        setBots(newBots)
      }
    }, 100) // Check every 100ms for smoother updates
    
    return () => clearInterval(interval)
  }, [])

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing')
  const completedOrders = orders.filter(o => o.status === 'complete')
  const idleBots = bots.filter(b => b.orderId === null)
  const activeBots = bots.filter(b => b.orderId !== null)

  return (
    <div className="app">
      <h1>🍔 McDonald's Order Manager</h1>
      
      <div className="controls">
        <div className="order-controls">
          <button onClick={() => addOrder('normal')} className="btn-normal">
            New Normal Order
          </button>
          <button onClick={() => addOrder('vip')} className="btn-vip">
            New VIP Order
          </button>
        </div>
        
        <div className="bot-controls">
          <button onClick={addBot} className="btn-add-bot">
            + Bot
          </button>
          <button onClick={removeBot} className="btn-remove-bot" disabled={bots.length === 0}>
            - Bot
          </button>
          <span className="bot-count">
            Bots: {bots.length} ({activeBots.length} active, {idleBots.length} idle)
          </span>
        </div>
      </div>

      <div className="order-areas">
        <div className="order-area pending-area">
          <h2>📋 PENDING</h2>
          <div className="order-list">
            {pendingOrders.length === 0 ? (
              <p className="empty-message">No pending orders</p>
            ) : (
              pendingOrders.map(order => (
                <OrderCard key={order.id} order={order} bots={bots} />
              ))
            )}
          </div>
        </div>

        <div className="order-area complete-area">
          <h2>✅ COMPLETE</h2>
          <div className="order-list">
            {completedOrders.length === 0 ? (
              <p className="empty-message">No completed orders</p>
            ) : (
              completedOrders.map(order => (
                <OrderCard key={order.id} order={order} bots={bots} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bot-status">
        <h3>🤖 Bot Status</h3>
        <div className="bot-list">
          {bots.length === 0 ? (
            <p className="empty-message">No bots available</p>
          ) : (
            bots.map(bot => (
              <BotCard key={bot.id} bot={bot} orders={orders} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, bots }: { order: Order; bots: Bot[] }) {
  const [progress, setProgress] = useState(0)
  const bot = bots.find(b => b.id === order.botId)
  
  useEffect(() => {
    if (order.status !== 'processing' || !bot?.startTime) {
      setProgress(0)
      return
    }
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - bot.startTime!
      const newProgress = Math.min((elapsed / PROCESSING_TIME) * 100, 100)
      setProgress(newProgress)
    }, 100)
    
    return () => clearInterval(interval)
  }, [order.status, bot?.startTime])
  
  return (
    <div className={`order-card ${order.type} ${order.status}`}>
      <div className="order-header">
        <span className="order-title">Order #{order.id} - {order.name}</span>
        <span className={`order-type ${order.type}`}>
          {order.type === 'vip' ? '⭐ VIP' : '👤 Normal'}
        </span>
      </div>
      {order.status === 'processing' && (
        <div className="processing-info">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="bot-label">Bot #{order.botId} cooking...</span>
        </div>
      )}
    </div>
  )
}

function BotCard({ bot, orders }: { bot: Bot; orders: Order[] }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const order = orders.find(o => o.id === bot.orderId)
  
  useEffect(() => {
    if (!bot.startTime) {
      setTimeRemaining(null)
      return
    }
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - bot.startTime!
      const remaining = Math.max(0, PROCESSING_TIME - elapsed)
      setTimeRemaining(Math.ceil(remaining / 1000))
    }, 100)
    
    return () => clearInterval(interval)
  }, [bot.startTime])
  
  return (
    <div className={`bot-card ${bot.orderId ? 'active' : 'idle'}`}>
      <span className="bot-id">🤖 Bot #{bot.id}</span>
      {bot.orderId ? (
        <span className="bot-status-text">
          Processing Order #{bot.orderId} 
          {order?.type === 'vip' && ' ⭐'}
          {timeRemaining !== null && ` (${timeRemaining}s)`}
        </span>
      ) : (
        <span className="bot-status-text idle">IDLE</span>
      )}
    </div>
  )
}

export default App
