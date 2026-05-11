<script setup lang="ts">
import type { CryptoWithdrawalListResponse } from '~~/shared/types/api-responses'

defineProps<{
  history: CryptoWithdrawalListResponse['withdrawals']
  truncateAddress: (addr: string) => string
  formatDt: (iso: string | null) => string
}>()

async function copyHash(h: string) {
  try { await navigator.clipboard.writeText(h) } catch {}
}
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold mb-3">{{ $t('trader.withdrawCrypto.recentTitle') }}</h2>
    <div class="trader-panel overflow-x-auto">
      <table v-if="history.length > 0" class="w-full text-sm min-w-[640px]">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.asset') }}</th>
            <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.quantity') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('trader.withdrawCrypto.thAddress') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('trader.withdrawCrypto.thTxHash') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in history" :key="w.id" class="border-b border-border last:border-0">
            <td class="px-4 py-3 num text-text-muted">{{ formatDt(w.submittedAt) }}</td>
            <td class="px-4 py-3">{{ w.asset }} <span class="text-xs text-text-muted">({{ w.network }})</span></td>
            <td class="px-4 py-3 text-right num">{{ w.amount }}</td>
            <td class="px-4 py-3 font-mono text-xs text-text-muted">{{ truncateAddress(w.toAddress) }}</td>
            <td class="px-4 py-3">
              <span
                class="text-xs px-2 py-0.5 rounded-sm font-medium"
                :class="{
                  'bg-warning/20 text-warning': w.status === 'pending',
                  'bg-success/20 text-success': w.status === 'completed'
                }"
              >
                {{ w.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                v-if="w.txHash"
                class="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-mono"
                @click="copyHash(w.txHash!)"
              >
                <span>{{ truncateAddress(w.txHash) }}</span>
                <Icon name="lucide:clipboard" size="12" aria-hidden="true" />
              </button>
              <span v-else class="text-text-muted text-xs">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="p-8 text-center text-sm text-text-muted">{{ $t('trader.withdrawCrypto.empty') }}</div>
    </div>
  </section>
</template>
