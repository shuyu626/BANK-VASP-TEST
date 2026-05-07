import { requireAdmin } from '~~/server/utils/require-admin'
import { buildOrderBook } from '~~/server/utils/orderbook-generator'
import { traderStore } from '~~/server/utils/trader-store'
import { symbolFromSlug } from '~~/shared/types/symbol-slug'

const LARGE_NOTIONAL_THRESHOLD_TWD = 1_000_000

export default defineEventHandler((event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug') ?? ''
  const symbol = symbolFromSlug(slug)
  const book = buildOrderBook(symbol)

  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  const openOrders = traderStore.getAllOrders()
    .filter(o => o.symbol === symbol && o.status === 'open' && o.type === 'limit')
    .map(o => ({
      ...o,
      owner: users.get(o.userId) ? {
        id: o.userId,
        displayName: users.get(o.userId)!.displayName,
        email: users.get(o.userId)!.email
      } : null,
      isLarge: o.price !== null && o.price * (o.quantity - o.filledQty) >= LARGE_NOTIONAL_THRESHOLD_TWD
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { symbol, book, openOrders }
})
