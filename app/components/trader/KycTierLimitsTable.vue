<script setup lang="ts">
import type { KycTier } from '~~/shared/types'
import { KYC_TIER_LIMITS, formatTwd } from '~~/shared/types/kyc-limits'

defineProps<{ currentTier: KycTier }>()

const { t } = useI18n()

function fmt(amount: number): string {
  return amount < 0 ? t('kycTier.customAmount') : formatTwd(amount)
}

const tierColumns = computed(() => [
  { key: 'tier', label: t('common.label.tier') },
  { key: 'dailyDepositTwd', label: t('trader.wallet.tier.dailyDeposit'), align: 'right' as const },
  { key: 'dailyWithdrawTwd', label: t('trader.wallet.tier.dailyWithdraw'), align: 'right' as const },
  { key: 'monthlyWithdrawTwd', label: t('trader.wallet.tier.monthlyWithdraw'), align: 'right' as const },
  { key: 'requirementsKey', label: t('common.label.required') }
])

const tierRows = computed(() => Object.values(KYC_TIER_LIMITS))
</script>

<template>
  <section class="trader-panel p-6">
    <h2 class="text-lg font-semibold mb-3">{{ $t('trader.wallet.tier.viewAll').replace('→','') }}</h2>
    <div class="overflow-x-auto">
      <BaseTable
        :columns="tierColumns"
        :items="tierRows"
        row-key="tier"
        numeric
        panel-class="bg-transparent border-0 rounded-none"
        :row-class="(row) => row.tier === currentTier ? 'bg-primary-500/5' : ''"
      >
        <template #cell-tier="{ row }">
          <div>
            {{ t(row.labelKey) }}
            <span v-if="row.tier === currentTier" class="ml-2 text-[10px] px-1.5 py-0.5 rounded-sm bg-primary-500/20 text-primary-400 uppercase">{{ $t('common.status.processing') }}</span>
          </div>
        </template>
        <template #cell-dailyDepositTwd="{ row }">{{ fmt(row.dailyDepositTwd) }}</template>
        <template #cell-dailyWithdrawTwd="{ row }">{{ fmt(row.dailyWithdrawTwd) }}</template>
        <template #cell-monthlyWithdrawTwd="{ row }">{{ fmt(row.monthlyWithdrawTwd) }}</template>
        <template #cell-requirementsKey="{ row }">
          <span class="text-xs text-text-muted">{{ t(row.requirementsKey) }}</span>
        </template>
      </BaseTable>
    </div>
  </section>
</template>
