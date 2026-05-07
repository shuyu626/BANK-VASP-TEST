import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const userId = session.user.id
  const today = new Date().toISOString()
  const limit = KYC_TIER_LIMITS[session.user.kycTier].dailyDepositTwd
  const used = traderStore.getDailyDepositTotal(userId, today)
  return {
    deposits: traderStore.getFiatDeposits(userId),
    dailyLimit: limit,
    dailyUsed: used,
    dailyRemaining: Math.max(0, limit - used)
  }
})
