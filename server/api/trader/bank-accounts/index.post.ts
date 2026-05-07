import type { BankAccount } from '~~/shared/types'
import { AddBankAccountInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = AddBankAccountInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  // 帳戶名必須與註冊時的真實姓名一致（同名規則：本人帳號才能綁）
  // demo 簡化：與 displayName 比對
  const expectedName = session.user.displayName
  if (parsed.data.accountName.trim() !== expectedName.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'NAME_MISMATCH' })
  }

  // 檢查同 user 不能重複綁定同一帳號
  const existing = traderStore.getBankAccounts(session.user.id)
  if (existing.some(b => b.bankCode === parsed.data.bankCode && b.accountNumber === parsed.data.accountNumber)) {
    throw createError({ statusCode: 409, statusMessage: 'DUPLICATE_BANK_ACCOUNT' })
  }

  const entry: BankAccount = {
    id: `ba_${Math.random().toString(36).slice(2, 10)}`,
    userId: session.user.id,
    bankCode: parsed.data.bankCode,
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    accountName: parsed.data.accountName,
    isVerified: false,
    verifiedAt: null
  }

  traderStore.addBankAccount(entry)
  traderStore.appendAudit({
    actor: session.user.id,
    actorRole: 'user',
    action: 'wallet.bank_account.add',
    resourceType: 'bank_account',
    resourceId: entry.id,
    metadata: { bankCode: entry.bankCode },
    ipAddress: getRequestIP(event) ?? null
  })

  return { bankAccount: entry }
})
