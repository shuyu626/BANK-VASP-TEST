import type { MarketTicker, KlinePoint } from '~~/shared/types'
import { createSeededRandom, hashSeed } from './seed'

export const mockMarkets: MarketTicker[] = [
  { symbol: 'BTC/USDT',  base: 'BTC',  quote: 'USDT', name: 'Bitcoin',   price: 67482.31, change24h: 2.34,  volume24h: 1842300000, high24h: 68210.5, low24h: 65820.0, icon: '₿' },
  { symbol: 'ETH/USDT',  base: 'ETH',  quote: 'USDT', name: 'Ethereum',  price: 3521.78,  change24h: 3.12,  volume24h: 921400000,  high24h: 3580.1,  low24h: 3410.2,  icon: 'Ξ' },
  { symbol: 'SOL/USDT',  base: 'SOL',  quote: 'USDT', name: 'Solana',    price: 184.42,   change24h: -1.27, volume24h: 412300000,  high24h: 192.8,   low24h: 181.0,   icon: '◎' },
  { symbol: 'BNB/USDT',  base: 'BNB',  quote: 'USDT', name: 'BNB',       price: 612.05,   change24h: 0.87,  volume24h: 238500000,  high24h: 618.4,   low24h: 604.1,   icon: 'B' },
  { symbol: 'XRP/USDT',  base: 'XRP',  quote: 'USDT', name: 'Ripple',    price: 0.5821,   change24h: -2.43, volume24h: 187200000,  high24h: 0.601,   low24h: 0.578,   icon: 'X' },
  { symbol: 'ADA/USDT',  base: 'ADA',  quote: 'USDT', name: 'Cardano',   price: 0.4287,   change24h: 1.65,  volume24h: 92800000,   high24h: 0.435,   low24h: 0.418,   icon: 'A' },
  { symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin',  price: 0.1612,   change24h: 5.42,  volume24h: 168400000,  high24h: 0.168,   low24h: 0.152,   icon: 'Ð' },
  { symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', name: 'Avalanche', price: 36.78,    change24h: -0.92, volume24h: 78600000,   high24h: 37.9,    low24h: 36.2,    icon: 'V' }
]

// 台幣交易對（VASP × 銀行的核心場景）
export const mockMarketsTwd: MarketTicker[] = [
  { symbol: 'BTC/TWD',  base: 'BTC',  quote: 'TWD', name: 'Bitcoin',  price: 2184500,  change24h: 2.34,  volume24h: 584200000,  high24h: 2210300, low24h: 2132100, icon: '₿' },
  { symbol: 'ETH/TWD',  base: 'ETH',  quote: 'TWD', name: 'Ethereum', price: 114210,   change24h: 3.12,  volume24h: 286700000,  high24h: 116040,  low24h: 110450,  icon: 'Ξ' },
  { symbol: 'USDT/TWD', base: 'USDT', quote: 'TWD', name: 'Tether',   price: 32.42,    change24h: 0.08,  volume24h: 642300000,  high24h: 32.5,    low24h: 32.35,   icon: '₮' },
  { symbol: 'SOL/TWD',  base: 'SOL',  quote: 'TWD', name: 'Solana',   price: 5980,     change24h: -1.27, volume24h: 128400000,  high24h: 6240,    low24h: 5870,    icon: '◎' }
]

export type KlineInterval = '15m' | '1h' | '4h' | '1D'

const INTERVAL_MS: Record<KlineInterval, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000
}

// 不同時間區間 → 不同波動幅度（時間越長、波動越大），讓 4 個按鈕視覺上有明顯差異
const VOLATILITY: Record<KlineInterval, number> = {
  '15m': 0.012,
  '1h': 0.025,
  '4h': 0.05,
  '1D': 0.09
}

const WICK: Record<KlineInterval, number> = {
  '15m': 0.004,
  '1h': 0.008,
  '4h': 0.015,
  '1D': 0.025
}

export function generateKlines(symbol: string, count = 60, interval: KlineInterval = '15m'): KlinePoint[] {
  const all = [...mockMarkets, ...mockMarketsTwd]
  const base = all.find((m) => m.symbol === symbol)?.price ?? 100
  // seed 含 interval，讓不同時間區間產生不同走勢（不只是時間軸縮放）
  const rand = createSeededRandom(hashSeed(`${symbol}-${interval}`))
  const intervalMs = INTERVAL_MS[interval]
  const driftScale = VOLATILITY[interval]
  const wickScale = WICK[interval]

  const points: KlinePoint[] = []
  // 起點價格略低於目前 ticker，讓最右端的 close 接近 ticker.price
  let price = base * 0.96
  // Fixed reference time so SSR/CSR match
  const anchor = new Date('2026-04-23T00:00:00Z').getTime()
  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.5) * base * driftScale
    const open = price
    const close = Math.max(0.0001, open + drift)
    const high = Math.max(open, close) * (1 + rand() * wickScale)
    const low = Math.min(open, close) * (1 - rand() * wickScale)
    const volume = base * (50 + rand() * 200)
    const time = new Date(anchor - (count - i) * intervalMs).toISOString()
    points.push({ time, open, high, low, close, volume })
    price = close
  }
  return points
}
