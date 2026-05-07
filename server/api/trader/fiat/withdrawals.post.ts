import type { FiatWithdrawal } from '~~/shared/types'
import { FiatWithdrawInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { scheduleFiatWithdraw } from '~~/server/utils/settlement-engine'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'
import { TRANSFER_FEES } from '~~/shared/types/transfer-fees'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  if (session.user.isFrozen) {
    throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_FROZEN' })
  }
  if (session.user.kycStatus !== 'approved') {
    throw createError({ statusCode: 403, statusMessage: 'KYC_NOT_APPROVED' })
  }

  const body = await readBody(event)
  const parsed = FiatWithdrawInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  const userId = session.user.id
  const today = new Date().toISOString()

  // Validate bank account
  const bankAccount = traderStore.getBankAccounts(userId).find(b => b.id === parsed.data.bankAccountId)
  if (!bankAccount) {
    throw createError({ statusCode: 404, statusMessage: 'BANK_ACCOUNT_NOT_FOUND' })
  }
  if (!bankAccount.isVerified) {
    throw createError({ statusCode: 409, statusMessage: 'BANK_ACCOUNT_UNVERIFIED' })
  }

  const fee = TRANSFER_FEES.fiatWithdraw.fixedTwd
  if (parsed.data.amount < TRANSFER_FEES.fiatWithdraw.minAmount) {
    throw createError({ statusCode: 422, statusMessage: 'BELOW_MIN_AMOUNT' })
  }

  // Balance check
  const ta = traderStore.getTrustAccount(userId)
  if (!ta) throw createError({ statusCode: 409, statusMessage: 'NO_TRUST_ACCOUNT' })
  const frozen = traderStore.getFiatWithdrawals(userId)
    .filter(w => w.status === 'pending' || w.status === 'approved')
    .reduce((sum, w) => sum + w.amount + w.fee, 0)
  if (ta.balance - frozen < parsed.data.amount + fee) {
    throw createError({ statusCode: 422, statusMessage: 'INSUFFICIENT_BALANCE' })
  }

  // Limit checks
  const tierLimit = KYC_TIER_LIMITS[session.user.kycTier]
  const dailyUsed = traderStore.getDailyWithdrawTotal(userId, today)
  const monthlyUsed = traderStore.getMonthlyWithdrawTotal(userId, today)

  if (tierLimit.dailyWithdrawTwd !== -1 && dailyUsed + parsed.data.amount > tierLimit.dailyWithdrawTwd) {
    throw createError({
      statusCode: 422,
      statusMessage: 'DAILY_LIMIT_EXCEEDED',
      data: { remaining: Math.max(0, tierLimit.dailyWithdrawTwd - dailyUsed) }
    })
  }
  if (tierLimit.monthlyWithdrawTwd !== -1 && monthlyUsed + parsed.data.amount > tierLimit.monthlyWithdrawTwd) {
    throw createError({
      statusCode: 422,
      statusMessage: 'MONTHLY_LIMIT_EXCEEDED',
      data: { remaining: Math.max(0, tierLimit.monthlyWithdrawTwd - monthlyUsed) }
    })
  }

  const withdrawal: FiatWithdrawal = {
    id: `fw_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    bankAccountId: bankAccount.id,
    amount: parsed.data.amount,
    fee,
    status: 'pending',
    submittedAt: today,
    approvedBy: null, approvedAt: null,
    completedAt: null, rejectReason: null
  }
  traderStore.addFiatWithdrawal(withdrawal)
  traderStore.appendAudit({
    actor: userId, actorRole: 'user',
    action: 'fiat.withdraw.request',
    resourceType: 'withdrawal', resourceId: withdrawal.id,
    metadata: { amount: withdrawal.amount, fee }, ipAddress: getRequestIP(event) ?? null
  })
  scheduleFiatWithdraw(withdrawal.id)

  return { withdrawal }
})
