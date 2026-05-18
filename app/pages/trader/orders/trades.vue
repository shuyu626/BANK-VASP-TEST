<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import type { TableColumn } from '~/components/common/BaseTable.vue'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.trades') }))

const orders = useOrdersStore()
const session = useSessionStore()
const { trades } = storeToRefs(orders)
await orders.loadTrades()
const router = useRouter()

function sideFor(tr: { buyerId: string; sellerId: string }) {
  return tr.buyerId === session.user?.id ? 'buy' : 'sell'
}

const summary = computed(() => ({
  count: trades.value.length,
  volume: trades.value.reduce((a, b) => a + b.quantity, 0),
  fee: trades.value.reduce((a, b) => a + b.fee, 0)
}))

const columns = computed<TableColumn[]>(() => [
  { key: 'timestamp', label: t('common.label.time') },
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'side', label: t('common.label.side') },
  { key: 'price', label: t('common.label.price'), align: 'right' },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' },
  { key: 'fee', label: t('common.label.fee'), align: 'right' }
])

function exportCsv() {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const filename = `trades_${ts.slice(0, 8)}_${ts.slice(8, 14)}.csv`
  const header = ['id', 'symbol', 'side', 'price', 'quantity', 'fee', 'timestamp']
  const rows = trades.value.map(tr => [
    tr.id, tr.symbol, sideFor(tr),
    tr.price.toFixed(2), tr.quantity.toFixed(6), tr.fee.toFixed(4), tr.timestamp
  ])
  const lines = [header, ...rows].map(r =>
    r.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')
  )
  const csv = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-5">
    <BasePageHeader :title="$t('trader.trades.title')" :subtitle="$t('trader.trades.subtitle')" weight="bold">
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="router.push('/trader/orders')">
          {{ $t('trader.trades.back') }}
        </BaseButton>
        <BaseButton variant="secondary" size="sm" :disabled="trades.length === 0" @click="exportCsv">
          {{ $t('trader.trades.exportCsv') }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="grid grid-cols-3 gap-3">
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.count') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ summary.count }}</div>
      </div>
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.volume') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ fmtQty(summary.volume) }}</div>
      </div>
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.fee') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ summary.fee.toFixed(4) }}</div>
      </div>
    </div>

    <!-- 桌機 / 平板：表格 -->
    <div class="hidden md:block">
      <BaseTable
        :columns="columns"
        :items="trades"
        row-key="id"
        paginated
        :default-page-size="20"
        :page-size-options="[10, 20, 50, 100]"
        :empty-text="$t('trader.trades.empty')"
        panel-class="trader-panel overflow-hidden"
        numeric
      >
        <template #cell-timestamp="{ row }">
          <span class="text-text-muted">{{ fmtDt(row.timestamp) }}</span>
        </template>
        <template #cell-symbol="{ row }"><span class="font-medium">{{ row.symbol }}</span></template>
        <template #cell-side="{ row }">
          <span :class="sideFor(row) === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ sideFor(row) === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
        </template>
        <template #cell-price="{ row }">{{ fmtPrice(row.price) }}</template>
        <template #cell-quantity="{ row }">{{ fmtQty(row.quantity) }}</template>
        <template #cell-fee="{ row }"><span class="text-text-muted">{{ row.fee.toFixed(4) }}</span></template>
      </BaseTable>
    </div>

    <!-- 手機：卡片 -->
    <div class="md:hidden space-y-3">
      <p v-if="trades.length === 0" class="text-center text-text-muted py-10">{{ $t('trader.trades.emptyMobile') }}</p>
      <div v-for="tr in trades" :key="tr.id" class="bg-surface border border-border rounded-md p-4">
        <div class="flex items-center justify-between">
          <span class="font-bold">{{ tr.symbol }}</span>
          <span :class="sideFor(tr) === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ sideFor(tr) === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
          <div><span class="text-text-muted text-[10px] uppercase tracking-wide">{{ $t('common.label.price') }}</span><div class="num">{{ fmtPrice(tr.price) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase tracking-wide">{{ $t('common.label.quantity') }}</span><div class="num">{{ fmtQty(tr.quantity) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase tracking-wide">{{ $t('common.label.fee') }}</span><div class="num">{{ tr.fee.toFixed(4) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase tracking-wide">{{ $t('common.label.time') }}</span><div class="num text-text-muted">{{ fmtDt(tr.timestamp, 'minute') }}</div></div>
        </div>
      </div>
    </div>
  </div>
</template>
