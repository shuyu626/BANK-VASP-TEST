import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const userId = session.user.id
  const today = new Date().toISOString()
  const tier = KYC_TIER_LIMITS[session.user.kycTier]
  const dailyUsed = traderStore.getDailyWithdrawTotal(userId, today)
  const monthlyUsed = traderStore.getMonthlyWithdrawTotal(userId, today)
  return {
    withdrawals: traderStore.getFiatWithdrawals(userId),
    dailyLimit: tier.dailyWithdrawTwd,
    dailyUsed,
    dailyRemaining: tier.dailyWithdrawTwd === -1 ? -1 : Math.max(0, tier.dailyWithdrawTwd - dailyUsed),
    monthlyLimit: tier.monthlyWithdrawTwd,
    monthlyUsed,
    monthlyRemaining: tier.monthlyWithdrawTwd === -1 ? -1 : Math.max(0, tier.monthlyWithdrawTwd - monthlyUsed)
  }
})
