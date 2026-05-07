import { traderStore } from '~~/server/utils/trader-store'
import { amlStore } from '~~/server/utils/aml-store'
import { reportStore } from '~~/server/utils/report-store'

// 銀行端把 AML 警示升級為 SAR：產生 SAR draft + 寫 audit log
// 不對 user 做凍結（凍結是交易所責任）
export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id'))
  const body = await readBody<{ narrative: string }>(event)

  if (!body.narrative || body.narrative.trim().length < 20) {
    throw createError({ statusCode: 400, statusMessage: 'NARRATIVE_TOO_SHORT' })
  }

  const alert = amlStore.findById(id)
  if (!alert) throw createError({ statusCode: 404, statusMessage: 'ALERT_NOT_FOUND' })
  if (alert.resolvedAt) throw createError({ statusCode: 409, statusMessage: 'ALERT_ALREADY_RESOLVED' })

  const sar = reportStore.createSarDraft({
    userId: alert.userId,
    alertId: alert.id,
    narrative: body.narrative.trim(),
    createdBy: 'bank_compliance'
  })

  amlStore.resolveAlert(alert.id, 'escalated_to_sar', 'bank_compliance')

  traderStore.appendAudit({
    actor: 'bank_compliance',
    actorRole: 'bank',
    action: 'aml.alert.escalate',
    resourceType: 'aml',
    resourceId: alert.id,
    metadata: { sarId: sar.id },
    ipAddress: '10.50.2.1'
  })

  return { ok: true, sar }
})
