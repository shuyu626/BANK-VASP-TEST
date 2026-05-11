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
      <table class="w-full">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.asset') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.holdings') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.marketPrice') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.valueTwd') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.change24h') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.pnl') }}</th>
          </tr>
        </thead>
        <tbody class="num">
          <tr v-for="h in holdings" :key="h.symbol" class="border-b border-border last:border-0 hover:bg-surface-alt transition">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-alt text-primary-400 font-bold">
                  {{ h.icon }}
                </span>
                <div>
                  <div class="font-medium">{{ h.symbol }}</div>
                  <div class="text-xs text-text-muted">{{ h.name }}</div>
                </div>
              </div>
            </td>
            <td class="text-right px-4 py-3">{{ formatAmount(h.amount, 4) }}</td>
            <td class="text-right px-4 py-3 text-text-muted">{{ fmtPrice(h.priceTwd) }}</td>
            <td class="text-right px-4 py-3">{{ h.valueTwd.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}</td>
            <td class="text-right px-4 py-3" :class="h.change24h >= 0 ? 'up' : 'down'">
              {{ h.change24h >= 0 ? '+' : '' }}{{ h.change24h.toFixed(2) }}%
            </td>
            <td class="text-right px-4 py-3" :class="h.pnlPct >= 0 ? 'up' : 'down'">
              {{ h.pnlPct >= 0 ? '+' : '' }}{{ h.pnlPct.toFixed(2) }}%
            </td>
          </tr>
        </tbody>
      </table>
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
