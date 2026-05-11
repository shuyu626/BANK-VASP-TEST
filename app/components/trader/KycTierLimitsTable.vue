<script setup lang="ts">
import type { KycTier } from '~~/shared/types'
import { KYC_TIER_LIMITS, formatTwd } from '~~/shared/types/kyc-limits'

defineProps<{ currentTier: KycTier }>()

const { t } = useI18n()

function fmt(amount: number): string {
  return amount < 0 ? t('kycTier.customAmount') : formatTwd(amount)
}
</script>

<template>
  <section class="trader-panel p-6">
    <h2 class="text-lg font-semibold mb-3">{{ $t('trader.wallet.tier.viewAll').replace('→','') }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-3 py-2 font-medium">{{ $t('common.label.tier') }}</th>
            <th class="text-right px-3 py-2 font-medium">{{ $t('trader.wallet.tier.dailyDeposit') }}</th>
            <th class="text-right px-3 py-2 font-medium">{{ $t('trader.wallet.tier.dailyWithdraw') }}</th>
            <th class="text-right px-3 py-2 font-medium">{{ $t('trader.wallet.tier.monthlyWithdraw') }}</th>
            <th class="text-left px-3 py-2 font-medium">{{ $t('common.label.required') }}</th>
          </tr>
        </thead>
        <tbody class="num">
          <tr
            v-for="limit in Object.values(KYC_TIER_LIMITS)"
            :key="limit.tier"
            class="border-b border-border last:border-0"
            :class="{ 'bg-primary-500/5': limit.tier === currentTier }"
          >
            <td class="px-3 py-2">
              {{ t(limit.labelKey) }}
              <span v-if="limit.tier === currentTier" class="ml-2 text-[10px] px-1.5 py-0.5 rounded-sm bg-primary-500/20 text-primary-400 uppercase">{{ $t('common.status.processing') }}</span>
            </td>
            <td class="text-right px-3 py-2">{{ fmt(limit.dailyDepositTwd) }}</td>
            <td class="text-right px-3 py-2">{{ fmt(limit.dailyWithdrawTwd) }}</td>
            <td class="text-right px-3 py-2">{{ fmt(limit.monthlyWithdrawTwd) }}</td>
            <td class="px-3 py-2 text-xs text-text-muted">{{ t(limit.requirementsKey) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
