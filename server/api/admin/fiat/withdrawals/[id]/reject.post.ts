import { RejectWithdrawalInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = RejectWithdrawalInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const w = traderStore.findFiatWithdrawal(id)
  if (!w) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })
  if (w.status === 'completed') throw createError({ statusCode: 409, statusMessage: 'ALREADY_COMPLETED' })
  if (w.status === 'rejected') throw createError({ statusCode: 409, statusMessage: 'ALREADY_REJECTED' })

  traderStore.updateFiatWithdrawal(id, { status: 'rejected', rejectReason: parsed.data.reason })
  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'fiat.withdraw.reject',
    resourceType: 'withdrawal', resourceId: id,
    metadata: { reason: parsed.data.reason, amount: w.amount },
    ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
