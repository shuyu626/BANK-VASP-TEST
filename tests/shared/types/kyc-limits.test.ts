import { describe, it, expect } from 'vitest'
import { KYC_TIER_LIMITS, formatTwd } from '~~/shared/types/kyc-limits'

describe('KYC_TIER_LIMITS', () => {
  it('exposes all four tiers', () => {
    expect(Object.keys(KYC_TIER_LIMITS).sort()).toEqual(['tier0', 'tier1', 'tier2', 'tier3'])
  })

  it('limits monotonically increase from tier1 to tier2', () => {
    const t1 = KYC_TIER_LIMITS.tier1
    const t2 = KYC_TIER_LIMITS.tier2
    expect(t2.dailyDepositTwd).toBeGreaterThan(t1.dailyDepositTwd)
    expect(t2.dailyWithdrawTwd).toBeGreaterThan(t1.dailyWithdrawTwd)
    expect(t2.monthlyWithdrawTwd).toBeGreaterThan(t1.monthlyWithdrawTwd)
  })

  it('tier0 blocks all flows', () => {
    const t0 = KYC_TIER_LIMITS.tier0
    expect(t0.dailyDepositTwd).toBe(0)
    expect(t0.dailyWithdrawTwd).toBe(0)
    expect(t0.monthlyWithdrawTwd).toBe(0)
  })

  it('tier3 is currently unavailable (placeholder)', () => {
    expect(KYC_TIER_LIMITS.tier3.available).toBe(false)
    // sentinel -1 表示「客製額度」
    expect(KYC_TIER_LIMITS.tier3.dailyDepositTwd).toBe(-1)
  })

  it('all tiers have well-formed i18n key references', () => {
    for (const t of Object.values(KYC_TIER_LIMITS)) {
      expect(t.labelKey).toMatch(/^kycTier\.tier[0-3]\.label$/)
      expect(t.copyKey).toMatch(/^kycTier\.tier[0-3]\.copy$/)
      expect(t.requirementsKey).toMatch(/^kycTier\.tier[0-3]\.requirements$/)
      expect(t.unlocksKey).toMatch(/^kycTier\.tier[0-3]\.unlocks$/)
    }
  })
})

describe('formatTwd', () => {
  it('formats positive amounts with en-US comma grouping', () => {
    expect(formatTwd(1000)).toBe('NT$ 1,000')
    expect(formatTwd(1_500_000)).toBe('NT$ 1,500,000')
    expect(formatTwd(0)).toBe('NT$ 0')
  })

  it('formats negative numbers literally; callers handle "custom" via i18n', () => {
    // -1 sentinel 由呼叫端用 amount < 0 判斷後改用 t('kycTier.customAmount')
    expect(formatTwd(-1)).toBe('NT$ -1')
  })
})
