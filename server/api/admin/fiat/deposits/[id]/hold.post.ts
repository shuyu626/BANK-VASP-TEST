import { HoldDepositInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = HoldDepositInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const d = traderStore.findFiatDeposit(id)
  if (!d) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })
  if (d.status !== 'pending') throw createError({ statusCode: 409, statusMessage: 'NOT_PENDING' })

  traderStore.updateFiatDeposit(id, { status: 'reviewing', note: parsed.data.reason ?? d.note })
  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'fiat.deposit.hold',
    resourceType: 'deposit', resourceId: id,
    metadata: { reason: parsed.data.reason ?? null, amount: d.amount },
    ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
