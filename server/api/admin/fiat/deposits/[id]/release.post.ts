import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const d = traderStore.findFiatDeposit(id)
  if (!d) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })
  if (d.status !== 'reviewing') throw createError({ statusCode: 409, statusMessage: 'NOT_REVIEWING' })

  const now = new Date().toISOString()
  traderStore.updateFiatDeposit(id, {
    status: 'completed', completedAt: now,
    bankReference: `BR${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  })
  traderStore.adjustFiatBalance(d.userId, d.amount)
  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'fiat.deposit.release',
    resourceType: 'deposit', resourceId: id,
    metadata: { amount: d.amount },
    ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
