import { SetRiskLevelInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = SetRiskLevelInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const updated = traderStore.setUserRisk(id, parsed.data.level)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })

  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'user.risk.change',
    resourceType: 'user', resourceId: id,
    metadata: { level: parsed.data.level, note: parsed.data.note ?? null },
    ipAddress: getRequestIP(event) ?? null
  })

  return { user: updated }
})
