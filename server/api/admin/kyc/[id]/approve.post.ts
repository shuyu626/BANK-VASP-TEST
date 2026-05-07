import { KycApproveInputSchema } from '~~/shared/types/admin'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

function makeVirtualAccount(): string {
  const rand4 = () => Math.floor(1000 + Math.random() * 9000).toString()
  return `8056 2001 ${rand4()} ${rand4()}`
}

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody(event)
  const parsed = KycApproveInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const record = traderStore.listAllKycRecords().find(r => r.id === id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'KYC_NOT_FOUND' })
  if (record.status !== 'pending') throw createError({ statusCode: 409, statusMessage: 'ALREADY_REVIEWED' })

  const now = new Date().toISOString()
  traderStore.upsertKycRecord({
    ...record,
    status: 'approved',
    reviewedAt: now,
    reviewerId: admin.admin.id,
    tier: parsed.data.tier
  })
  traderStore.setUserKyc(record.userId, 'approved', parsed.data.tier)

  const existingTa = traderStore.getTrustAccount(record.userId)
  let createdTa = null
  if (!existingTa) {
    createdTa = traderStore.createTrustAccount({
      userId: record.userId,
      vaspId: 'vasp_demo',
      virtualAccountNumber: makeVirtualAccount()
    })
  }

  traderStore.appendAudit({
    actor: admin.admin.id, actorRole: admin.admin.role,
    action: 'kyc.approve',
    resourceType: 'kyc', resourceId: id,
    metadata: { userId: record.userId, tier: parsed.data.tier, trustCreated: !!createdTa },
    ipAddress: getRequestIP(event) ?? null
  })

  return { ok: true, tier: parsed.data.tier, createdTrustAccount: createdTa }
})
