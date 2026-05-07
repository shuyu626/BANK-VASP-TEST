import { z } from 'zod'
import { traderStore } from '~~/server/utils/trader-store'

const BodySchema = z.object({
  note: z.string().optional()
})

// Bank teller 標記 KYC 比對通過：寫 bankVerifiedAt + audit log
export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id'))
  const record = traderStore.listAllKycRecords().find(r => r.id === id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'KYC_NOT_FOUND' })
  if (record.status !== 'approved') {
    throw createError({ statusCode: 400, statusMessage: 'KYC_NOT_APPROVED_BY_EXCHANGE' })
  }
  if (record.bankVerifiedAt) {
    throw createError({ statusCode: 409, statusMessage: 'ALREADY_VERIFIED' })
  }

  const parsed = BodySchema.safeParse(await readBody(event).catch(() => ({})))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const body = parsed.data

  const now = new Date().toISOString()
  // mutate in-place — getKycRecord returns the live reference
  const live = traderStore.getKycRecord(record.userId)
  if (live) live.bankVerifiedAt = now

  // KYC 比對通過後，連帶把該用戶所有「已新增但未驗證」的銀行帳戶標為已驗證
  // 真實情境：銀行行員會逐一核對；demo 簡化為一鍵帶過
  const verifiedBankAccounts = traderStore.verifyAllBankAccounts(record.userId, now)

  traderStore.appendAudit({
    actor: 'bank_teller',
    actorRole: 'bank',
    action: 'kyc.bank.verify',
    resourceType: 'kyc',
    resourceId: record.id,
    metadata: { note: body.note ?? null, verifiedBankAccounts },
    ipAddress: '10.50.2.1'
  })

  return { ok: true, bankVerifiedAt: now, verifiedBankAccounts }
})
