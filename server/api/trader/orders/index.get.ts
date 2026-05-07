import type { OrderStatus } from '~~/shared/types'
import { requireSession } from '~~/server/utils/require-session'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const q = getQuery(event)
  const statusFilter = typeof q.status === 'string' ? (q.status as OrderStatus) : null
  let list = traderStore.getUserOrders(session.user.id)
  if (statusFilter) list = list.filter(o => o.status === statusFilter)
  return { orders: list }
})
