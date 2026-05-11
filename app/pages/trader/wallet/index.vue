<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'
import { useKycStore } from '~/stores/kyc'
import { useWalletStore } from '~/stores/wallet'
import { mockMarketsTwd } from '~/utils/mock'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.wallet') }))

const { prefs } = useTraderPrefs()
const tradeTarget = computed(() => `/trader/trade/${prefs.value.defaultPair}`)

const session = useSessionStore()
const kyc = useKycStore()
const wallet = useWalletStore()
const { user, kycStatus, kycTier } = storeToRefs(session)
const {
  trustAccount, holdings: rawHoldings,
  pendingDeposits, pendingWithdrawals, pendingCryptoWithdrawals,
  frozenTwd, fiatAvailable,
  error: walletError
} = storeToRefs(wallet)

async function loadAll() {
  if (!kyc.limits) await kyc.loadStatus()
  await wallet.loadSnapshot()
}
await loadAll()

const holdings = computed(() => {
  return rawHoldings.value.map((h) => {
    const ticker = mockMarketsTwd.find(m => m.base === h.symbol)
    const priceTwd = ticker?.price ?? h.avgCost
    const change24h = ticker?.change24h ?? 0
    const valueTwd = priceTwd * h.amount
    const pnlPct = h.avgCost > 0 ? ((priceTwd - h.avgCost) / h.avgCost) * 100 : 0
    return { ...h, priceTwd, change24h, valueTwd, pnlPct }
  })
})

const cryptoValueTwd = computed(() =>
  holdings.value.reduce((sum, h) => sum + h.valueTwd, 0)
)
const fiatBalance = computed(() => trustAccount.value?.balance ?? 0)
const totalValueTwd = computed(() => cryptoValueTwd.value + fiatBalance.value)

const isApproved = computed(() => kycStatus.value === 'approved')
const currentLimit = computed(() => KYC_TIER_LIMITS[kycTier.value])

const recentTransfers = computed(() => {
  // label 留空，由 RecentTransfersWidget 內部走 i18n 產生（避免硬編語系字串）
  const list = [
    ...pendingDeposits.value.map(d => ({ kind: 'deposit' as const, id: d.id, at: d.submittedAt, amount: d.amount, status: d.status })),
    ...pendingWithdrawals.value.map(w => ({ kind: 'withdrawal' as const, id: w.id, at: w.submittedAt, amount: -w.amount, status: w.status })),
    ...pendingCryptoWithdrawals.value.map(c => ({ kind: 'crypto' as const, id: c.id, at: c.submittedAt, amount: c.amount, status: c.status, asset: c.asset }))
  ]
  return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
})

const polling = usePolling(() => wallet.refresh(), {
  intervalMs: 1500,
  shouldContinue: () => wallet.hasPendingActivity
})
onMounted(() => {
  if (wallet.hasPendingActivity) polling.start()
})
</script>

<template>
  <div v-if="walletError && !trustAccount" class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold mb-1">{{ $t('trader.wallet.title') }}</h1>
    </header>
    <BasePageError :message="walletError" @retry="loadAll" />
  </div>
  <div v-else-if="user" class="space-y-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold mb-1">{{ $t('trader.wallet.title') }}</h1>
        <p class="text-sm text-text-muted truncate">
          {{ user.displayName }} · {{ $t(currentLimit.labelKey) }}
        </p>
      </div>
      <div class="text-right shrink-0">
        <div class="text-xs text-text-muted uppercase tracking-wider">{{ $t('trader.wallet.totalValue') }}</div>
        <div class="text-2xl font-semibold num">{{ fmtTwd(totalValueTwd) }}</div>
        <div v-if="frozenTwd > 0" class="text-xs text-warning mt-1">
          {{ $t('trader.wallet.frozen') }} {{ fmtTwd(frozenTwd) }}
        </div>
      </div>
    </header>

    <TraderKycGateBanner v-if="!isApproved" :kyc-status="kycStatus" />

    <TraderFiatPanel
      :trust-account="trustAccount"
      :fiat-balance="fiatBalance"
      :fiat-available="fiatAvailable"
      :frozen-twd="frozenTwd"
      :is-approved="isApproved"
    />

    <TraderHoldingsTable
      :holdings="holdings"
      :crypto-value-twd="cryptoValueTwd"
      :is-approved="isApproved"
      :trade-target="tradeTarget"
    />

    <TraderRecentTransfersWidget
      :transfers="recentTransfers"
      :has-pending-activity="wallet.hasPendingActivity"
    />

    <TraderTierLimitsPanel :tier="currentLimit" />
  </div>
</template>
