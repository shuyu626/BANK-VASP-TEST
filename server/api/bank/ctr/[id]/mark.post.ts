import { z } from 'zod'
import { traderStore } from '~~/server/utils/trader-store'
import { reportStore } from '~~/server/utils/report-store'

const BodySchema = z.object({
  status: z.enum(['submitted', 'accepted']).default('submitted')
})

// 標記 CTR 已送出至調查局
export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id'))
  const parsed = BodySchema.safeParse(await readBody(event).catch(() => ({})))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { status } = parsed.data

  const r = status === 'accepted' ? reportStore.markCtrAccepted(id) : reportStore.markCtrSubmitted(id)
  if (!r) throw createError({ statusCode: 404, statusMessage: 'CTR_NOT_FOUND' })

  traderStore.appendAudit({
    actor: 'bank_compliance',
    actorRole: 'bank',
    action: `ctr.${status}`,
    resourceType: 'ctr',
    resourceId: id,
    metadata: {},
    ipAddress: '10.50.2.1'
  })

  return { ok: true, report: r }
})
