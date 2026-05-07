import { generateKlines, type KlineInterval } from '~~/app/utils/mock/markets'
import { symbolFromSlug } from '~~/shared/types/symbol-slug'

const VALID_INTERVALS: readonly KlineInterval[] = ['15m', '1h', '4h', '1D']

function isValidInterval(v: string): v is KlineInterval {
  return (VALID_INTERVALS as readonly string[]).includes(v)
}

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const q = getQuery(event)
  const raw = typeof q.interval === 'string' ? q.interval : '15m'
  const interval: KlineInterval = isValidInterval(raw) ? raw : '15m'
  const symbol = symbolFromSlug(slug)
  return {
    symbol,
    interval,
    klines: generateKlines(symbol, 60, interval)
  }
})
