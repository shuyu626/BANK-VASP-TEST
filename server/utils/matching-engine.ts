import type { Order, Trade, OrderSide, OrderType, User } from '~~/shared/types'
import { traderStore } from './trader-store'
import { mockMarkets, mockMarketsTwd } from '~~/app/utils/mock/markets'

const FEE_RATE = 0.001  // 0.1%
const MARKET_SLIPPAGE = 0.0002  // 0.02%

function getMarkPrice(symbol: string): number {
  const t = [...mockMarkets, ...mockMarketsTwd].find(m => m.symbol === symbol)
  return t?.price ?? 0
}

function parseBase(symbol: string): string {
  return symbol.split('/')[0] ?? ''
}
function parseQuote(symbol: string): string {
  return symbol.split('/')[1] ?? ''
}

interface PlaceOrderArgs {
  user: User
  symbol: string
  side: OrderSide
  type: OrderType
  price: number | null
  quantity: number
}

export function placeOrder(args: PlaceOrderArgs): Order {
  const { user, symbol, side, type, price, quantity } = args
  const userId = user.id
  if (user.kycStatus !== 'approved') {
    throw createError({ statusCode: 403, statusMessage: 'KYC_NOT_APPROVED' })
  }
  const quote = parseQuote(symbol)
  const base = parseBase(symbol)
  const mark = getMarkPrice(symbol)
  if (mark === 0) {
    throw createError({ statusCode: 400, statusMessage: 'UNKNOWN_SYMBOL' })
  }

  const now = new Date().toISOString()
  const id = `o_${Math.random().toString(36).slice(2, 10)}`

  if (type === 'limit') {
    if (price === null) {
      throw createError({ statusCode: 400, statusMessage: 'LIMIT_PRICE_REQUIRED' })
    }
    return placeLimit({ id, userId, symbol, side, price, quantity, quote, base, now })
  }

  // market
  const effectivePrice = side === 'buy'
    ? mark * (1 + MARKET_SLIPPAGE)
    : mark * (1 - MARKET_SLIPPAGE)

  return fillImmediate({ id, userId, symbol, side, price: effectivePrice, quantity, quote, base, now, counterpartyId: 'mock-market' })
}

interface LimitArgs {
  id: string; userId: string; symbol: string
  side: OrderSide; price: number; quantity: number
  quote: string; base: string; now: string
}

function placeLimit(a: LimitArgs): Order {
  const notional = a.price * a.quantity

  if (a.side === 'buy') {
    // Only support TWD quote in demo (USDT pairs can also work if user holds USDT)
    if (a.quote === 'TWD') {
      const ta = traderStore.getTrustAccount(a.userId)
      const available = (ta?.balance ?? 0) - frozenTwd(a.userId)
      if (available < notional * (1 + FEE_RATE)) {
        throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_BALANCE' })
      }
    } else {
      // Quote asset check (USDT etc.)
      const quoteHolding = traderStore.getHolding(a.userId, a.quote)?.amount ?? 0
      if (quoteHolding < notional * (1 + FEE_RATE)) {
        throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_BALANCE' })
      }
    }
  } else {
    const baseHolding = traderStore.getHolding(a.userId, a.base)?.amount ?? 0
    if (baseHolding < a.quantity) {
      throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_HOLDING' })
    }
  }

  const order: Order = {
    id: a.id, userId: a.userId,
    symbol: a.symbol,
    side: a.side,
    type: 'limit',
    price: a.price,
    quantity: a.quantity,
    filledQty: 0,
    avgFillPrice: null,
    status: 'open',
    createdAt: a.now,
    updatedAt: a.now
  }
  traderStore.addOrder(order)
  traderStore.appendAudit({
    actor: a.userId, actorRole: 'user',
    action: 'order.place.limit',
    resourceType: 'order', resourceId: order.id,
    metadata: { symbol: a.symbol, side: a.side, price: a.price, qty: a.quantity },
    ipAddress: null
  })
  return order
}

interface ImmediateArgs {
  id: string; userId: string; symbol: string
  side: OrderSide; price: number; quantity: number
  quote: string; base: string; now: string
  counterpartyId: string
}

function fillImmediate(a: ImmediateArgs): Order {
  const notional = a.price * a.quantity
  const fee = notional * FEE_RATE

  if (a.side === 'buy') {
    if (a.quote === 'TWD') {
      const ta = traderStore.getTrustAccount(a.userId)
      const available = (ta?.balance ?? 0) - frozenTwd(a.userId)
      if (available < notional + fee) {
        throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_BALANCE' })
      }
      traderStore.adjustFiatBalance(a.userId, -(notional + fee))
    } else {
      const quoteAmt = traderStore.getHolding(a.userId, a.quote)?.amount ?? 0
      if (quoteAmt < notional + fee) {
        throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_BALANCE' })
      }
      traderStore.adjustHolding(a.userId, a.quote, -(notional + fee))
    }
    // Credit base
    ensureHolding(a.userId, a.base)
    traderStore.adjustHolding(a.userId, a.base, a.quantity)
  } else {
    const baseHolding = traderStore.getHolding(a.userId, a.base)?.amount ?? 0
    if (baseHolding < a.quantity) {
      throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_HOLDING' })
    }
    traderStore.adjustHolding(a.userId, a.base, -a.quantity)
    if (a.quote === 'TWD') {
      // credit TWD
      traderStore.adjustFiatBalance(a.userId, notional - fee)
    } else {
      ensureHolding(a.userId, a.quote)
      traderStore.adjustHolding(a.userId, a.quote, notional - fee)
    }
  }

  const order: Order = {
    id: a.id, userId: a.userId,
    symbol: a.symbol, side: a.side,
    type: 'market',
    price: null,
    quantity: a.quantity,
    filledQty: a.quantity,
    avgFillPrice: a.price,
    status: 'filled',
    createdAt: a.now,
    updatedAt: a.now
  }
  traderStore.addOrder(order)

  const trade: Trade = {
    id: `tr_${Math.random().toString(36).slice(2, 10)}`,
    symbol: a.symbol,
    buyOrderId: a.side === 'buy' ? order.id : a.counterpartyId,
    sellOrderId: a.side === 'sell' ? order.id : a.counterpartyId,
    price: a.price,
    quantity: a.quantity,
    timestamp: a.now,
    buyerId: a.side === 'buy' ? a.userId : a.counterpartyId,
    sellerId: a.side === 'sell' ? a.userId : a.counterpartyId,
    fee
  }
  traderStore.addTrade(trade)
  traderStore.appendAudit({
    actor: a.userId, actorRole: 'user',
    action: 'order.fill.market',
    resourceType: 'order', resourceId: order.id,
    metadata: { symbol: a.symbol, side: a.side, qty: a.quantity, price: a.price, fee },
    ipAddress: null
  })
  return order
}

function frozenTwd(userId: string): number {
  // open buy-limit orders in TWD pairs freeze quote
  return traderStore.getUserOrders(userId)
    .filter(o => o.status === 'open' && o.side === 'buy' && o.type === 'limit')
    .filter(o => o.symbol.endsWith('/TWD'))
    .reduce((sum, o) => sum + (o.price ?? 0) * (o.quantity - o.filledQty) * (1 + FEE_RATE), 0)
}

function ensureHolding(userId: string, symbol: string): void {
  if (traderStore.getHolding(userId, symbol)) return
  // seed a zero-balance holding so subsequent adjust works
  const icons: Record<string, string> = { BTC: '₿', ETH: 'Ξ', SOL: '◎', USDT: '₮', BNB: 'B', XRP: 'X', ADA: 'A', DOGE: 'Ð', AVAX: 'V' }
  const names: Record<string, string> = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', USDT: 'Tether', BNB: 'BNB', XRP: 'Ripple', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche' }
  const mark = getMarkPrice(`${symbol}/TWD`) || getMarkPrice(`${symbol}/USDT`) || 1
  traderStore.getHoldings(userId).push({
    userId,
    symbol,
    name: names[symbol] ?? symbol,
    amount: 0,
    avgCost: mark,
    icon: icons[symbol] ?? symbol[0] ?? '?'
  })
}

export function cancelOrder(userId: string, orderId: string): Order {
  const order = traderStore.findOrder(orderId)
  if (!order || order.userId !== userId) {
    throw createError({ statusCode: 404, statusMessage: 'ORDER_NOT_FOUND' })
  }
  if (order.status !== 'open') {
    throw createError({ statusCode: 409, statusMessage: 'ORDER_NOT_OPEN' })
  }
  const updated = traderStore.updateOrder(orderId, { status: 'cancelled' })!
  traderStore.appendAudit({
    actor: userId, actorRole: 'user',
    action: 'order.cancel',
    resourceType: 'order', resourceId: orderId,
    metadata: { symbol: order.symbol }, ipAddress: null
  })
  return updated
}
