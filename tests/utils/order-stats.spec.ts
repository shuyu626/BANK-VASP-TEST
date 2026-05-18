import { describe, it, expect } from 'vitest'
import { computeOrderStats, orderRowVM } from '~~/app/utils/order-stats'
import type { Order, Trade } from '~~/shared/types'

function mkOrder(p: Partial<Order>): Order {
  return {
    id: 'o1', userId: 'u1', symbol: 'BTC/TWD', side: 'buy', type: 'limit',
    price: 100, quantity: 2, filledQty: 1, avgFillPrice: 100,
    status: 'partial', createdAt: '2026-05-15T10:00:00',
    updatedAt: '2026-05-15T10:05:00', ...p
  }
}
function mkTrade(p: Partial<Trade>): Trade {
  return {
    id: 't1', symbol: 'BTC/TWD', price: 100, quantity: 1,
    buyOrderId: 'b', sellOrderId: 's', buyerId: 'u1', sellerId: 'u2',
    fee: 5, timestamp: '2026-05-15T10:00:00', ...p
  }
}

describe('orderRowVM', () => {
  it('computes fill progress percent (clamped 0..100)', () => {
    expect(orderRowVM(mkOrder({ filledQty: 1, quantity: 2 })).progressPct).toBe(50)
    expect(orderRowVM(mkOrder({ filledQty: 0, quantity: 0 })).progressPct).toBe(0)
    expect(orderRowVM(mkOrder({ filledQty: 5, quantity: 2 })).progressPct).toBe(100)
  })
  it('computes notional from price*qty, falls back to avgFillPrice, else null', () => {
    expect(orderRowVM(mkOrder({ price: 100, quantity: 2 })).notional).toBe(200)
    expect(orderRowVM(mkOrder({ price: null, avgFillPrice: 90, quantity: 3 })).notional).toBe(270)
    expect(orderRowVM(mkOrder({ price: null, avgFillPrice: null })).notional).toBeNull()
  })
  it('marks open/partial as cancelable', () => {
    expect(orderRowVM(mkOrder({ status: 'open' })).cancelable).toBe(true)
    expect(orderRowVM(mkOrder({ status: 'partial' })).cancelable).toBe(true)
    expect(orderRowVM(mkOrder({ status: 'filled' })).cancelable).toBe(false)
  })
  it('derives quote currency from symbol', () => {
    expect(orderRowVM(mkOrder({ symbol: 'BTC/TWD' })).quote).toBe('TWD')
    expect(orderRowVM(mkOrder({ symbol: 'ETH/USDT' })).quote).toBe('USDT')
  })
  it('returns empty quote when symbol has no slash', () => {
    expect(orderRowVM(mkOrder({ symbol: 'BTCTWD' })).quote).toBe('')
  })
})

describe('computeOrderStats', () => {
  const now = new Date('2026-05-15T23:00:00')

  it('counts open + partial orders for openCount.value', () => {
    const orders = [
      mkOrder({ id: 'a', status: 'open' }),
      mkOrder({ id: 'b', status: 'partial' }),
      mkOrder({ id: 'c', status: 'filled' })
    ]
    const s = computeOrderStats(orders, [], now, 'u1')
    expect(s.openCount.value).toBe(2)
  })

  it('sums today fills count and 30d fees from trades', () => {
    const trades = [
      mkTrade({ id: 't1', timestamp: '2026-05-15T09:00:00', fee: 10 }),
      mkTrade({ id: 't2', timestamp: '2026-05-15T20:00:00', fee: 5 }),
      mkTrade({ id: 't3', timestamp: '2026-05-01T10:00:00', fee: 7 }),
      mkTrade({ id: 't4', timestamp: '2026-03-01T10:00:00', fee: 99 })
    ]
    const s = computeOrderStats([], trades, now, 'u1')
    expect(s.filledToday.value).toBe(2)
    expect(s.fee30d.value).toBe(22) // 10 + 5 + 7, 03-01 超過 30 天不算
  })

  it('produces deterministic synthetic series for open stats (same seed key)', () => {
    const orders = [mkOrder({ status: 'open' })]
    const a = computeOrderStats(orders, [], now, 'user-xyz')
    const b = computeOrderStats(orders, [], now, 'user-xyz')
    expect(a.openNotional.series).toEqual(b.openNotional.series)
    expect(a.openCount.series.length).toBeGreaterThanOrEqual(2)
  })

  it('delta dir compares last vs previous bucket', () => {
    const s = computeOrderStats([], [
      mkTrade({ id: 'x', timestamp: '2026-05-15T09:00:00', fee: 1 })
    ], now, 'u1')
    expect(['up', 'down', 'flat']).toContain(s.fee30d.delta.dir)
  })

  it('handles empty input without throwing', () => {
    const s = computeOrderStats([], [], now, 'u1')
    expect(s.openCount.value).toBe(0)
    expect(s.fee30d.value).toBe(0)
    expect(s.filledToday.series.length).toBeGreaterThanOrEqual(2)
  })
})
