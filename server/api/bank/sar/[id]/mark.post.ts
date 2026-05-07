import { z } from 'zod'
import { traderStore } from '~~/server/utils/trader-store'
import { reportStore } from '~~/server/utils/report-store'

const BodySchema = z.object({
  status: z.enum(['submitted', 'accepted']).default('submitted')
})

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id'))
  const parsed = BodySchema.safeParse(await readBody(event).catch(() => ({})))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { status } = parsed.data

  const r = status === 'accepted' ? reportStore.markSarAccepted(id) : reportStore.markSarSubmitted(id)
  if (!r) throw createError({ statusCode: 404, statusMessage: 'SAR_NOT_FOUND' })

  traderStore.appendAudit({
    actor: 'bank_compliance',
    actorRole: 'bank',
    action: `sar.${status}`,
    resourceType: 'sar',
    resourceId: id,
    metadata: {},
    ipAddress: '10.50.2.1'
  })

  return { ok: true, report: r }
})
