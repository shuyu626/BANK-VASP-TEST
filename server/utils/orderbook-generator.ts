import type { OrderBookLevel, OrderBookSnapshot } from '~~/shared/types'
import { mockMarkets, mockMarketsTwd } from '~~/app/utils/mock/markets'
import { createSeededRandom, hashSeed } from '~~/app/utils/mock/seed'
import { traderStore } from './trader-store'

// Deterministic order-book generator keyed by (symbol, minute).
// Merges in open limit orders from any user so the book always reflects
// the user's own placements.

function findTicker(symbol: string) {
  return [...mockMarkets, ...mockMarketsTwd].find(t => t.symbol === symbol)
}

export function buildOrderBook(symbol: string): OrderBookSnapshot {
  const ticker = findTicker(symbol)
  const mid = ticker?.price ?? 100
  const now = new Date()
  const minuteBucket = Math.floor(now.getTime() / 60_000)
  const rand = createSeededRandom(hashSeed(`${symbol}:${minuteBucket}`))

  const tickSize = mid > 10_000 ? 10 : mid > 100 ? 0.5 : mid > 1 ? 0.01 : 0.0001
  const rawBids: OrderBookLevel[] = []
  const rawAsks: OrderBookLevel[] = []

  for (let i = 0; i < 10; i++) {
    const bidPrice = Math.round((mid - (i + 1) * tickSize) / tickSize) * tickSize
    const askPrice = Math.round((mid + (i + 1) * tickSize) / tickSize) * tickSize
    const bidQty = roundQty(mid, 0.2 + rand() * 1.5)
    const askQty = roundQty(mid, 0.2 + rand() * 1.5)
    rawBids.push({ price: bidPrice, quantity: bidQty })
    rawAsks.push({ price: askPrice, quantity: askQty })
  }

  // Merge user limit orders (all users, all sessions — mock simplification)
  const allUserOpenOrders = collectAllOpenOrders(symbol)
  for (const o of allUserOpenOrders) {
    if (o.price === null) continue
    const side = o.side === 'buy' ? rawBids : rawAsks
    const remaining = o.quantity - o.filledQty
    if (remaining <= 0) continue
    const hit = side.find(l => l.price === o.price)
    if (hit) hit.quantity += remaining
    else side.push({ price: o.price, quantity: remaining })
  }

  const bids = rawBids.sort((a, b) => b.price - a.price).slice(0, 10)
  const asks = rawAsks.sort((a, b) => a.price - b.price).slice(0, 10)
  return { symbol, bids, asks, timestamp: now.toISOString() }
}

function roundQty(midPrice: number, base: number): number {
  if (midPrice > 1000) return Math.round(base * 10_000) / 10_000   // 4 decimals
  if (midPrice > 10)   return Math.round(base * 100) / 100
  return Math.round(base * 10) / 10
}

function collectAllOpenOrders(symbol: string) {
  return traderStore.getAllOrders()
    .filter(o => o.symbol === symbol && o.status === 'open' && o.type === 'limit')
}

// Synthesize recent-trades list for a symbol (deterministic by minute bucket)
export function buildRecentTrades(symbol: string, count = 20) {
  const ticker = findTicker(symbol)
  const mid = ticker?.price ?? 100
  const now = Date.now()
  const rand = createSeededRandom(hashSeed(`trades:${symbol}:${Math.floor(now / 60_000)}`))
  const trades = []
  for (let i = 0; i < count; i++) {
    const priceJitter = (rand() - 0.5) * mid * 0.002
    const price = Math.max(0.0001, mid + priceJitter)
    const quantity = roundQty(mid, 0.05 + rand() * 0.8)
    const side = rand() > 0.5 ? 'buy' : 'sell'
    trades.push({
      id: `t_${Math.floor(now / 60_000)}_${i}`,
      symbol,
      price,
      quantity,
      side,
      timestamp: new Date(now - i * 11_000 - Math.floor(rand() * 4000)).toISOString()
    })
  }
  return trades.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
