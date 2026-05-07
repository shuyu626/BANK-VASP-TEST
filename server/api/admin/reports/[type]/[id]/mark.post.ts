import { MarkReportInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { reportStore } from '~~/server/utils/report-store'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const type = getRouterParam(event, 'type') ?? ''
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = MarkReportInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  if (type !== 'ctr' && type !== 'sar') throw createError({ statusCode: 400, statusMessage: 'UNKNOWN_TYPE' })

  let result
  if (type === 'ctr') {
    result = parsed.data.status === 'submitted' ? reportStore.markCtrSubmitted(id) : reportStore.markCtrAccepted(id)
  } else {
    result = parsed.data.status === 'submitted' ? reportStore.markSarSubmitted(id) : reportStore.markSarAccepted(id)
  }
  if (!result) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })

  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: `report.${type}.${parsed.data.status}`,
    resourceType: type, resourceId: id,
    metadata: {}, ipAddress: getRequestIP(event) ?? null
  })
  return { report: result }
})
