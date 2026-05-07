import type { FiatDeposit } from '~~/shared/types'
import { FiatDepositInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { scheduleFiatDeposit } from '~~/server/utils/settlement-engine'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)

  if (session.user.isFrozen) {
    throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_FROZEN' })
  }
  if (session.user.kycStatus !== 'approved') {
    throw createError({ statusCode: 403, statusMessage: 'KYC_NOT_APPROVED' })
  }

  const body = await readBody(event)
  const parsed = FiatDepositInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  const userId = session.user.id
  const today = new Date().toISOString()
  const limit = KYC_TIER_LIMITS[session.user.kycTier].dailyDepositTwd
  const usedToday = traderStore.getDailyDepositTotal(userId, today)
  const remaining = limit - usedToday

  if (parsed.data.amount > remaining) {
    traderStore.appendAudit({
      actor: userId, actorRole: 'user',
      action: 'fiat.deposit.rejected',
      resourceType: 'deposit', resourceId: 'n/a',
      metadata: { amount: parsed.data.amount, reason: 'LIMIT_EXCEEDED', remaining },
      ipAddress: getRequestIP(event) ?? null
    })
    throw createError({
      statusCode: 422,
      statusMessage: 'LIMIT_EXCEEDED',
      data: { remaining }
    })
  }

  const ta = traderStore.getTrustAccount(userId)
  if (!ta) {
    throw createError({ statusCode: 409, statusMessage: 'NO_TRUST_ACCOUNT' })
  }

  const deposit: FiatDeposit = {
    id: `fd_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    trustAccountId: ta.id,
    amount: parsed.data.amount,
    status: 'pending',
    bankReference: 'pending',
    submittedAt: today,
    completedAt: null,
    note: parsed.data.note ?? null
  }
  traderStore.addFiatDeposit(deposit)
  traderStore.appendAudit({
    actor: userId, actorRole: 'user',
    action: 'fiat.deposit.request',
    resourceType: 'deposit', resourceId: deposit.id,
    metadata: { amount: deposit.amount }, ipAddress: getRequestIP(event) ?? null
  })
  scheduleFiatDeposit(deposit.id)

  return { deposit, remaining: remaining - deposit.amount }
})
