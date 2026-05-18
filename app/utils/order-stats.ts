import type { Order, Trade } from '~~/shared/types'
import { createSeededRandom, hashSeed } from '~/utils/mock/seed'

export interface OrderRowVM {
  progressPct: number
  notional: number | null
  cancelable: boolean
  quote: string
}

export function orderRowVM(o: Order): OrderRowVM {
  const progressPct = o.quantity > 0
    ? Math.min(100, Math.max(0, Math.round((o.filledQty / o.quantity) * 100)))
    : 0
  const unit = o.price ?? o.avgFillPrice ?? null
  const notional = unit === null ? null : unit * o.quantity
  const cancelable = o.status === 'open' || o.status === 'partial'
  const quote = o.symbol.split('/')[1] ?? ''
  return { progressPct, notional, cancelable, quote }
}

export type Delta = { dir: 'up' | 'down' | 'flat'; text: string }
export interface SparkSeries { value: number; series: number[]; delta: Delta }
export interface OrderStats {
  openCount: SparkSeries
  openNotional: SparkSeries
  filledToday: SparkSeries
  fee30d: SparkSeries
}

const DAY = 86_400_000

function deltaOf(series: number[]): Delta {
  if (series.length < 2) return { dir: 'flat', text: '—' }
  const last = series[series.length - 1]!
  const prev = series[series.length - 2]!
  if (last > prev) return { dir: 'up', text: `+${(last - prev).toLocaleString('en-US')}` }
  if (last < prev) return { dir: 'down', text: `-${(prev - last).toLocaleString('en-US')}` }
  return { dir: 'flat', text: '—' }
}

/** 近 `days` 天，每天一個 bucket 的真實累計（取 `pick` 數值；count=每筆計 1） */
function dailySeries(
  trades: Trade[], now: Date, days: number, pick: (t: Trade) => number
): number[] {
  const end = now.getTime()
  const start = end - days * DAY
  const buckets = new Array(days).fill(0) as number[]
  for (const t of trades) {
    const ts = new Date(t.timestamp).getTime()
    if (Number.isNaN(ts) || ts < start || ts > end) continue
    const idx = Math.min(days - 1, Math.floor((ts - start) / DAY))
    buckets[idx]! += pick(t)
  }
  return buckets
}

/** 決定性合成序列：給定 seedKey 永遠相同（SSR/CSR safe），收斂到 endValue */
function syntheticSeries(seedKey: string, points: number, endValue: number): number[] {
  const rnd = createSeededRandom(hashSeed(seedKey))
  const out: number[] = []
  let v = endValue * (0.6 + rnd() * 0.3)
  for (let i = 0; i < points - 1; i++) {
    v = Math.max(0, v + (rnd() - 0.45) * endValue * 0.15)
    out.push(Math.round(v))
  }
  out.push(Math.round(endValue))
  return out
}

export function computeOrderStats(
  orders: Order[], trades: Trade[], now: Date, seedKey: string
): OrderStats {
  // UTC calendar day on purpose: keeps the synthetic seed + "today" bucket deterministic and SSR/CSR-identical (demo data; not localized).
  const todayStr = now.toISOString().slice(0, 10)

  const openOrders = orders.filter(o => o.status === 'open' || o.status === 'partial')
  const openCountVal = openOrders.length
  const openNotionalVal = openOrders.reduce((sum, o) => {
    const vm = orderRowVM(o)
    return sum + (vm.notional ?? 0)
  }, 0)

  const filledTodayVal = trades.filter(t => t.timestamp.slice(0, 10) === todayStr).length
  const feeDaily = dailySeries(trades, now, 30, t => t.fee)
  const fee30dVal = feeDaily.reduce((a, b) => a + b, 0)
  const filledDaily = dailySeries(trades, now, 7, () => 1)

  const openCountSeries = syntheticSeries(`${seedKey}:oc:${todayStr}`, 7, openCountVal)
  const openNotionalSeries = syntheticSeries(`${seedKey}:on:${todayStr}`, 7, openNotionalVal)

  return {
    openCount: { value: openCountVal, series: openCountSeries, delta: deltaOf(openCountSeries) },
    openNotional: { value: openNotionalVal, series: openNotionalSeries, delta: deltaOf(openNotionalSeries) },
    filledToday: { value: filledTodayVal, series: filledDaily, delta: deltaOf(filledDaily) },
    fee30d: { value: fee30dVal, series: feeDaily, delta: deltaOf(feeDaily) }
  }
}
