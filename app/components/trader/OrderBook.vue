<script setup lang="ts">
import type { OrderBookLevel } from '~~/shared/types'

const props = defineProps<{
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  midPrice: number | null
}>()

const emit = defineEmits<{
  (e: 'pick', payload: { price: number; side: 'buy' | 'sell' }): void
}>()

function cum(side: OrderBookLevel[], i: number): number {
  let sum = 0
  for (let k = 0; k <= i; k++) sum += side[k]?.quantity ?? 0
  return sum
}

const maxBidCum = computed(() => cum(props.bids, props.bids.length - 1) || 1)
const maxAskCum = computed(() => cum(props.asks, props.asks.length - 1) || 1)

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}
function fmtQty(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}
</script>

<template>
  <div class="trader-panel">
    <div class="px-4 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider">
      {{ $t('components.orderbook.title') }}
    </div>
    <div class="grid grid-cols-3 text-xs text-text-muted px-4 py-2 border-b border-border">
      <span>{{ $t('common.label.price') }} (TWD)</span>
      <span class="text-right">{{ $t('components.orderbook.qty') }}</span>
      <span class="text-right">{{ $t('components.orderbook.cumulative') }}</span>
    </div>

    <!-- Asks (sell) — rendered top-down, best ask at bottom -->
    <ul class="divide-y divide-border num text-xs">
      <li
        v-for="(lvl, i) in [...asks].reverse()"
        :key="'a-' + i + '-' + lvl.price"
        class="relative grid grid-cols-3 px-4 py-1 cursor-pointer hover:bg-surface-alt"
        @click="emit('pick', { price: lvl.price, side: 'buy' })"
      >
        <span
          class="absolute inset-y-0 right-0 bg-market-up/10"
          :style="{ width: `${(cum(asks, asks.length - 1 - i) / maxAskCum) * 100}%` }"
        />
        <span class="relative text-market-up">{{ fmt(lvl.price) }}</span>
        <span class="relative text-right">{{ fmtQty(lvl.quantity) }}</span>
        <span class="relative text-right text-text-muted">{{ fmtQty(cum(asks, asks.length - 1 - i)) }}</span>
      </li>
    </ul>

    <!-- Mid -->
    <div class="px-4 py-2 border-y border-border text-center">
      <div class="text-xs text-text-muted">Mid</div>
      <div class="text-base font-semibold num">{{ midPrice !== null ? fmt(midPrice) : '—' }}</div>
    </div>

    <!-- Bids (buy) -->
    <ul class="divide-y divide-border num text-xs">
      <li
        v-for="(lvl, i) in bids"
        :key="'b-' + i + '-' + lvl.price"
        class="relative grid grid-cols-3 px-4 py-1 cursor-pointer hover:bg-surface-alt"
        @click="emit('pick', { price: lvl.price, side: 'sell' })"
      >
        <span
          class="absolute inset-y-0 right-0 bg-market-down/10"
          :style="{ width: `${(cum(bids, i) / maxBidCum) * 100}%` }"
        />
        <span class="relative text-market-down">{{ fmt(lvl.price) }}</span>
        <span class="relative text-right">{{ fmtQty(lvl.quantity) }}</span>
        <span class="relative text-right text-text-muted">{{ fmtQty(cum(bids, i)) }}</span>
      </li>
    </ul>
  </div>
</template>
