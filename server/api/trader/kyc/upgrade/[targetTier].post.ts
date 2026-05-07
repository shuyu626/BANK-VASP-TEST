import type { KycRecord, KycTier } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler((event) => {
  const sid = getCookie(event, COOKIE_NAME)
  const session = sid ? traderStore.findSession(sid) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }

  const target = getRouterParam(event, 'targetTier') as KycTier | undefined

  if (target === 'tier3') {
    throw createError({ statusCode: 403, statusMessage: 'TIER3_DEFERRED' })
  }
  if (target !== 'tier2') {
    throw createError({ statusCode: 400, statusMessage: 'UNSUPPORTED_TIER' })
  }
  if (session.user.kycTier !== 'tier1') {
    throw createError({ statusCode: 409, statusMessage: 'TIER_PROGRESSION_INVALID' })
  }

  const existing = traderStore.getKycRecord(session.user.id)
  if (!existing) {
    throw createError({ statusCode: 409, statusMessage: 'NO_BASE_KYC' })
  }

  const now = new Date().toISOString()
  const upgraded: KycRecord = {
    ...existing,
    id: `kyc_${Math.random().toString(36).slice(2, 8)}`,
    submittedAt: now,
    reviewedAt: null,
    reviewerId: null,
    status: 'pending',
    tier: 'tier2',
    rejectReason: null
  }
  traderStore.upsertKycRecord(upgraded)
  traderStore.setUserKyc(session.user.id, 'pending', 'tier1')

  return { record: upgraded }
})
