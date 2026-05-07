import type { KycStatus } from '~~/shared/types'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const statusFilter = typeof q.status === 'string' ? (q.status as KycStatus) : null

  let records = traderStore.listAllKycRecords()
  if (statusFilter) records = records.filter(r => r.status === statusFilter)
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  const enriched = records.map(r => ({
    record: r,
    user: users.get(r.userId)
  }))

  return { items: enriched }
})
