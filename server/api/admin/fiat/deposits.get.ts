import type { FiatTxStatus } from '~~/shared/types'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const statusFilter = typeof q.status === 'string' ? (q.status as FiatTxStatus) : null

  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  let deposits = traderStore.listAllUsers().flatMap(u => traderStore.getFiatDeposits(u.id))
  if (statusFilter) deposits = deposits.filter(d => d.status === statusFilter)
  deposits.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  return {
    items: deposits.map(d => ({
      deposit: d,
      user: users.get(d.userId) ? { id: d.userId, displayName: users.get(d.userId)!.displayName, email: users.get(d.userId)!.email } : null
    }))
  }
})
