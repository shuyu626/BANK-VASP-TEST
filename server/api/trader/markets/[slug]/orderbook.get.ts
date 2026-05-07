import { buildOrderBook } from '~~/server/utils/orderbook-generator'
import { symbolFromSlug } from '~~/shared/types/symbol-slug'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const symbol = symbolFromSlug(slug)
  return buildOrderBook(symbol)
})
