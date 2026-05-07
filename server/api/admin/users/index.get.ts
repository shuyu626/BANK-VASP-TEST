import type { KycStatus, RiskLevel } from '~~/shared/types'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const statusFilter = typeof q.kycStatus === 'string' ? (q.kycStatus as KycStatus) : null
  const riskFilter = typeof q.risk === 'string' ? (q.risk as RiskLevel) : null
  const frozenFilter = q.frozen === 'true' ? true : q.frozen === 'false' ? false : null
  const search = typeof q.q === 'string' ? q.q.toLowerCase() : ''

  let users = traderStore.listAllUsers()
  if (statusFilter) users = users.filter(u => u.kycStatus === statusFilter)
  if (riskFilter) users = users.filter(u => u.riskLevel === riskFilter)
  if (frozenFilter !== null) users = users.filter(u => u.isFrozen === frozenFilter)
  if (search) users = users.filter(u =>
    u.email.toLowerCase().includes(search) || u.displayName.toLowerCase().includes(search)
  )

  return { users }
})
