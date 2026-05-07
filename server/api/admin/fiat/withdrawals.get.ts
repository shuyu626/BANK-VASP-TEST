import type { FiatTxStatus } from '~~/shared/types'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const statusFilter = typeof q.status === 'string' ? (q.status as FiatTxStatus) : null

  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  let list = traderStore.listAllUsers().flatMap(u => traderStore.getFiatWithdrawals(u.id))
  if (statusFilter) list = list.filter(w => w.status === statusFilter)
  list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  return {
    items: list.map(w => ({
      withdrawal: w,
      user: users.get(w.userId) ? { id: w.userId, displayName: users.get(w.userId)!.displayName, email: users.get(w.userId)!.email } : null
    }))
  }
})
