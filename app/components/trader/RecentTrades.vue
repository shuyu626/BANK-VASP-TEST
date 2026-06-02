<script setup lang="ts">
interface Trade {
  id: string; price: number; quantity: number; side: 'buy' | 'sell'; timestamp: string
}
const props = defineProps<{ trades: Trade[] }>()

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}
function fmtQty(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}
function fmtTime(iso: string) {
  return iso.slice(11, 19)
}
</script>

<template>
  <div class="trader-panel">
    <div class="px-4 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider">
      {{ $t('components.recentTrades.title') }}
    </div>
    <div class="grid grid-cols-3 text-xs text-text-muted px-4 py-2 border-b border-border">
      <span>{{ $t('components.recentTrades.time') }}</span>
      <span class="text-right">{{ $t('components.recentTrades.price') }}</span>
      <span class="text-right">{{ $t('components.recentTrades.qty') }}</span>
    </div>
    <BaseScrollbar class="max-h-96">
      <ul class="divide-y divide-border num text-xs">
        <li v-for="t in trades" :key="t.id" class="grid grid-cols-3 px-4 py-1">
          <span class="text-text-muted">{{ fmtTime(t.timestamp) }}</span>
          <span class="text-right" :class="t.side === 'buy' ? 'text-market-up' : 'text-market-down'">
            {{ fmtPrice(t.price) }}
          </span>
          <span class="text-right">{{ fmtQty(t.quantity) }}</span>
        </li>
      </ul>
    </BaseScrollbar>
  </div>
</template>
