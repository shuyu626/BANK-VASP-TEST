import { traderStore } from '~~/server/utils/trader-store'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler((event) => {
  const sid = getCookie(event, COOKIE_NAME)
  const session = sid ? traderStore.findSession(sid) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }

  const record = traderStore.getKycRecord(session.user.id) ?? null
  return {
    record,
    currentTier: session.user.kycTier,
    currentStatus: session.user.kycStatus,
    limits: KYC_TIER_LIMITS
  }
})
