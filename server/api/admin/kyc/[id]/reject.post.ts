import { KycRejectInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = KycRejectInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const record = traderStore.listAllKycRecords().find(r => r.id === id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'KYC_NOT_FOUND' })
  if (record.status !== 'pending') throw createError({ statusCode: 409, statusMessage: 'ALREADY_REVIEWED' })

  const now = new Date().toISOString()
  traderStore.upsertKycRecord({
    ...record,
    status: 'rejected',
    reviewedAt: now,
    reviewerId: admin.admin.id,
    rejectReason: parsed.data.reason
  })
  traderStore.setUserKyc(record.userId, 'rejected', record.tier)

  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'kyc.reject',
    resourceType: 'kyc', resourceId: id,
    metadata: { userId: record.userId, reason: parsed.data.reason },
    ipAddress: getRequestIP(event) ?? null
  })

  return { ok: true }
})
