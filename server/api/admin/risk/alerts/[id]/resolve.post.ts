import { ResolveAlertInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { amlStore } from '~~/server/utils/aml-store'
import { reportStore } from '~~/server/utils/report-store'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = ResolveAlertInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const alert = amlStore.findById(id)
  if (!alert) throw createError({ statusCode: 404, statusMessage: 'ALERT_NOT_FOUND' })
  if (alert.resolvedAt) throw createError({ statusCode: 409, statusMessage: 'ALREADY_RESOLVED' })

  let sarDraft = null
  if (parsed.data.resolution === 'escalated_to_sar') {
    if (!parsed.data.narrative) {
      throw createError({ statusCode: 400, statusMessage: 'NARRATIVE_REQUIRED' })
    }
    sarDraft = reportStore.createSarDraft({
      userId: alert.userId, alertId: alert.id,
      narrative: parsed.data.narrative,
      createdBy: admin.admin.id
    })
  } else if (parsed.data.resolution === 'frozen_account') {
    traderStore.setUserFrozen(alert.userId, true)
    traderStore.appendAudit({
      actor: admin.admin.id, actorRole: admin.admin.role,
      action: 'user.freeze',
      resourceType: 'user', resourceId: alert.userId,
      metadata: { reason: `via aml alert ${alert.id}`, note: parsed.data.note ?? null },
      ipAddress: getRequestIP(event) ?? null
    })
  }

  amlStore.resolveAlert(id, parsed.data.resolution, admin.admin.id)
  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'aml.alert.resolve',
    resourceType: 'aml', resourceId: id,
    metadata: { resolution: parsed.data.resolution, note: parsed.data.note ?? null },
    ipAddress: getRequestIP(event) ?? null
  })

  return { ok: true, sarDraft }
})
