<script setup lang="ts">
import type { CryptoHolding } from '~~/app/utils/mock/users'

export interface ComputedHolding extends CryptoHolding {
  priceTwd: number
  change24h: number
  valueTwd: number
  pnlPct: number
}

defineProps<{
  holdings: ComputedHolding[]
  cryptoValueTwd: number
  isApproved: boolean
  tradeTarget: string
}>()

const { t } = useI18n()

function gatedTitle(actionKey: string, isApproved: boolean) {
  return isApproved ? undefined : t('trader.wallet.gatedTooltip', { action: t(`trader.wallet.gatedAction.${actionKey}`) })
}

function formatAmount(n: number, digits = 4) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

const holdingsColumns = computed(() => [
  { key: 'symbol', label: t('common.label.asset') },
  { key: 'amount', label: t('common.label.holdings'), align: 'right' as const },
  { key: 'priceTwd', label: t('common.label.marketPrice'), align: 'right' as const },
  { key: 'valueTwd', label: t('common.label.valueTwd'), align: 'right' as const },
  { key: 'change24h', label: t('common.label.change24h'), align: 'right' as const },
  { key: 'pnlPct', label: t('common.label.pnl'), align: 'right' as const }
])
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">{{ $t('trader.wallet.crypto.title') }}</h2>
      <div class="text-xs text-text-muted">
        {{ $t('trader.wallet.crypto.valueLabel') }}<span class="num">{{ fmtTwd(cryptoValueTwd) }}</span>
      </div>
    </div>

    <div v-if="holdings.length === 0" class="trader-panel p-8 text-center text-sm text-text-muted">
      {{ $t('trader.wallet.crypto.empty') }}
    </div>

    <div v-else class="trader-panel overflow-hidden">
      <BaseTable
        :columns="holdingsColumns"
        :items="holdings"
        row-key="symbol"
        numeric
        panel-class="bg-transparent border-0 rounded-none"
        table-min-width=""
        row-class="hover:bg-surface-alt transition"
      >
        <template #cell-symbol="{ row }">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-alt text-primary-400 font-bold">
              {{ row.icon }}
            </span>
            <div>
              <div class="font-medium">{{ row.symbol }}</div>
              <div class="text-xs text-text-muted">{{ row.name }}</div>
            </div>
          </div>
        </template>
        <template #cell-amount="{ row }">{{ formatAmount(row.amount, 4) }}</template>
        <template #cell-priceTwd="{ row }">
          <span class="text-text-muted">{{ fmtPrice(row.priceTwd) }}</span>
        </template>
        <template #cell-valueTwd="{ row }">{{ row.valueTwd.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</template>
        <template #cell-change24h="{ row }">
          <span :class="row.change24h >= 0 ? 'up' : 'down'">
            {{ row.change24h >= 0 ? '+' : '' }}{{ row.change24h.toFixed(2) }}%
          </span>
        </template>
        <template #cell-pnlPct="{ row }">
          <span :class="row.pnlPct >= 0 ? 'up' : 'down'">
            {{ row.pnlPct >= 0 ? '+' : '' }}{{ row.pnlPct.toFixed(2) }}%
          </span>
        </template>
      </BaseTable>
      <div class="px-4 py-3 border-t border-border flex gap-2 justify-end">
        <BaseButton
          v-if="isApproved"
          variant="secondary"
          to="/trader/wallet/withdraw-crypto"
        >
          {{ $t('trader.wallet.crypto.withdrawCta') }}
        </BaseButton>
        <BaseButton v-else variant="secondary" disabled>
          {{ $t('trader.wallet.crypto.withdrawCta') }}
        </BaseButton>

        <BaseButton
          v-if="isApproved"
          variant="primary"
          :to="tradeTarget"
        >
          {{ $t('trader.wallet.crypto.tradeCta') }}
        </BaseButton>
        <BaseButton v-else variant="primary" disabled>
          {{ $t('trader.wallet.crypto.tradeCta') }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
