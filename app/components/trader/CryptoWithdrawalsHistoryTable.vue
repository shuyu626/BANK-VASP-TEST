<script setup lang="ts">
import type { CryptoWithdrawalListResponse } from '~~/shared/types/api-responses'

defineProps<{
  history: CryptoWithdrawalListResponse['withdrawals']
  truncateAddress: (addr: string) => string
  formatDt: (iso: string | null) => string
}>()

const { t } = useI18n()

const historyColumns = computed(() => [
  { key: 'submittedAt', label: t('common.label.time') },
  { key: 'asset', label: t('common.label.asset') },
  { key: 'amount', label: t('common.label.quantity'), align: 'right' as const },
  { key: 'toAddress', label: t('trader.withdrawCrypto.thAddress') },
  { key: 'status', label: t('common.label.status') },
  { key: 'txHash', label: t('trader.withdrawCrypto.thTxHash') }
])

async function copyHash(h: string) {
  try { await navigator.clipboard.writeText(h) } catch {}
}
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold mb-3">{{ $t('trader.withdrawCrypto.recentTitle') }}</h2>
    <div class="trader-panel overflow-x-auto">
      <BaseTable
        :columns="historyColumns"
        :items="history"
        row-key="id"
        paginated
        :default-page-size="10"
        numeric
        panel-class="bg-transparent border-0 rounded-none"
        :empty-text="$t('trader.withdrawCrypto.empty')"
      >
        <template #cell-submittedAt="{ row }">
          <span class="text-text-muted">{{ formatDt(row.submittedAt) }}</span>
        </template>
        <template #cell-asset="{ row }">
          {{ row.asset }} <span class="text-xs text-text-muted">({{ row.network }})</span>
        </template>
        <template #cell-toAddress="{ row }">
          <span class="font-mono text-xs text-text-muted">{{ truncateAddress(row.toAddress) }}</span>
        </template>
        <template #cell-status="{ row }">
          <span
            class="text-xs px-2 py-0.5 rounded-sm font-medium"
            :class="{
              'bg-warning/20 text-warning': row.status === 'pending',
              'bg-success/20 text-success': row.status === 'completed'
            }"
          >
            {{ row.status }}
          </span>
        </template>
        <template #cell-txHash="{ row }">
          <button
            v-if="row.txHash"
            class="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-mono"
            @click="copyHash(row.txHash)"
          >
            <span>{{ truncateAddress(row.txHash) }}</span>
            <Icon name="lucide:clipboard" size="12" aria-hidden="true" />
          </button>
          <span v-else class="text-text-muted text-xs">—</span>
        </template>
      </BaseTable>
    </div>
  </section>
</template>
