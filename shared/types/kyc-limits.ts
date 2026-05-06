import type { KycTier } from './index'

/**
 * KYC 等級的「結構性」資料：金額限額 + 對應的 i18n key。
 *
 * 文字內容（label / copy / requirements / unlocks）改放 i18n（i18n/locales/*.json
 * 的 `kycTier.tierN.*`），呼叫端用 `t(KYC_TIER_LIMITS[tier].labelKey)` 取得本地化字串。
 *
 * 設計動機：避免在 shared module 寫死中文，讓 trader 端能跟 i18n 切換語系一致。
 */
export interface KycTierLimit {
  tier: KycTier
  labelKey: string
  copyKey: string
  requirementsKey: string
  unlocksKey: string
  dailyDepositTwd: number
  dailyWithdrawTwd: number
  monthlyWithdrawTwd: number
  available: boolean
}

export const KYC_TIER_LIMITS: Record<KycTier, KycTierLimit> = {
  tier0: {
    tier: 'tier0',
    labelKey: 'kycTier.tier0.label',
    copyKey: 'kycTier.tier0.copy',
    requirementsKey: 'kycTier.tier0.requirements',
    unlocksKey: 'kycTier.tier0.unlocks',
    dailyDepositTwd: 0,
    dailyWithdrawTwd: 0,
    monthlyWithdrawTwd: 0,
    available: true
  },
  tier1: {
    tier: 'tier1',
    labelKey: 'kycTier.tier1.label',
    copyKey: 'kycTier.tier1.copy',
    requirementsKey: 'kycTier.tier1.requirements',
    unlocksKey: 'kycTier.tier1.unlocks',
    dailyDepositTwd: 300_000,
    dailyWithdrawTwd: 100_000,
    monthlyWithdrawTwd: 2_000_000,
    available: true
  },
  tier2: {
    tier: 'tier2',
    labelKey: 'kycTier.tier2.label',
    copyKey: 'kycTier.tier2.copy',
    requirementsKey: 'kycTier.tier2.requirements',
    unlocksKey: 'kycTier.tier2.unlocks',
    dailyDepositTwd: 3_000_000,
    dailyWithdrawTwd: 1_000_000,
    monthlyWithdrawTwd: 15_000_000,
    available: true
  },
  tier3: {
    tier: 'tier3',
    labelKey: 'kycTier.tier3.label',
    copyKey: 'kycTier.tier3.copy',
    requirementsKey: 'kycTier.tier3.requirements',
    unlocksKey: 'kycTier.tier3.unlocks',
    dailyDepositTwd: -1,
    dailyWithdrawTwd: -1,
    monthlyWithdrawTwd: -1,
    available: false
  }
}

/**
 * 顯示新台幣金額。負數（如 tier3 的 -1 customized）由呼叫端自行處理 i18n
 * （例如 `amount < 0 ? t('kycTier.customAmount') : formatTwd(amount)`）。
 */
export function formatTwd(amount: number): string {
  return `NT$ ${amount.toLocaleString('en-US')}`
}
