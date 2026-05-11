<script setup lang="ts">
import type { KycTierLimit } from '~~/shared/types/kyc-limits'
import { formatTwd } from '~~/shared/types/kyc-limits'

defineProps<{
  tier: KycTierLimit
}>()

const { t } = useI18n()

function fmt(amount: number): string {
  return amount < 0 ? t('kycTier.customAmount') : formatTwd(amount)
}
</script>

<template>
  <section class="trader-panel p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ t('trader.wallet.tier.panelTitle', { tier: t(tier.labelKey) }) }}</h2>
      <NuxtLink to="/trader/kyc" class="text-xs text-primary-400 hover:text-primary-300">
        {{ $t('trader.wallet.tier.viewAll') }}
      </NuxtLink>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div>
        <div class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('trader.wallet.tier.dailyDeposit') }}</div>
        <div class="text-xl font-semibold num">{{ fmt(tier.dailyDepositTwd) }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('trader.wallet.tier.dailyWithdraw') }}</div>
        <div class="text-xl font-semibold num">{{ fmt(tier.dailyWithdrawTwd) }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('trader.wallet.tier.monthlyWithdraw') }}</div>
        <div class="text-xl font-semibold num">{{ fmt(tier.monthlyWithdrawTwd) }}</div>
      </div>
    </div>
    <p class="text-xs text-text-muted mt-4 leading-relaxed">
      {{ t(tier.copyKey) }}
      <span v-if="tier.tier !== 'tier3'" class="block mt-1">
        {{ $t('trader.wallet.tier.wantUpgrade') }}<NuxtLink to="/trader/kyc" class="text-primary-400">{{ $t('trader.wallet.tier.kycPage') }}</NuxtLink>{{ $t('trader.wallet.tier.wantUpgradeSuffix') }}
      </span>
    </p>
  </section>
</template>
