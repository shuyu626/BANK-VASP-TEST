<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.trades') }))

const orders = useOrdersStore()
const session = useSessionStore()
const { trades } = storeToRefs(orders)
await orders.loadTrades()

function sideFor(t: { buyerId: string; sellerId: string }) {
  return t.buyerId === session.user?.id ? 'buy' : 'sell'
}

function exportCsv() {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const filename = `trades_${ts.slice(0, 8)}_${ts.slice(8, 14)}.csv`
  const header = ['id', 'symbol', 'side', 'price', 'quantity', 'fee', 'timestamp']
  const rows = trades.value.map(t => [
    t.id,
    t.symbol,
    sideFor(t),
    t.price.toFixed(2),
    t.quantity.toFixed(6),
    t.fee.toFixed(4),
    t.timestamp
  ])
  const lines = [header, ...rows].map(r =>
    r.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')
  )
  const csv = '﻿' + lines.join('\n')  // BOM for Excel Chinese support
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
  <div class="space-y-4">
    <BasePageHeader :title="$t('trader.trades.title')" :subtitle="$t('trader.trades.subtitle')" weight="bold">
      <template #actions>
        <NuxtLink to="/trader/orders" class="text-sm text-text-muted hover:text-text">{{ $t('trader.trades.back') }}</NuxtLink>
        <BaseButton
          variant="secondary"
          :disabled="trades.length === 0"
          @click="exportCsv"
        >
          {{ $t('trader.trades.exportCsv') }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseTable
      :colspan="6"
      :empty="trades.length === 0"
      :empty-text="$t('trader.trades.empty')"
      panel-class="trader-panel overflow-hidden"
      numeric
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.symbol') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.side') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.price') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.quantity') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.fee') }}</th>
        </tr>
      </template>
      <tr v-for="t in trades" :key="t.id" class="border-b border-border last:border-0">
        <td class="px-4 py-3 text-text-muted">{{ fmtDt(t.timestamp) }}</td>
        <td class="px-4 py-3 font-medium">{{ t.symbol }}</td>
        <td class="px-4 py-3" :class="sideFor(t) === 'buy' ? 'text-market-down' : 'text-market-up'">
          {{ sideFor(t) === 'buy' ? $t('side.buy') : $t('side.sell') }}
        </td>
        <td class="px-4 py-3 text-right">{{ fmtPrice(t.price) }}</td>
        <td class="px-4 py-3 text-right">{{ fmtQty(t.quantity) }}</td>
        <td class="px-4 py-3 text-right text-text-muted">{{ t.fee.toFixed(4) }}</td>
      </tr>
    </BaseTable>
  </div>
</template>
