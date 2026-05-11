<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'
import { useMarketsStore } from '~/stores/markets'
import { symbolToSlug } from '~~/shared/types/symbol-slug'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.orderbook') }))

const reviews = useAdminReviewsStore()
const markets = useMarketsStore()
const { orderbook } = storeToRefs(reviews)

await markets.loadTickers()

const symbol = ref('BTC/TWD')
async function load() {
  await reviews.loadOrderbook(symbolToSlug(symbol.value))
}
await load()
watch(symbol, load)

usePolling(load, { intervalMs: 3000, immediate: true })
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.orderbook.title')">
      <template #actions>
        <div class="w-44">
          <BaseSelect
            v-model="symbol"
            :options="markets.tickers.map((t) => ({ value: t.symbol, label: t.symbol }))"
          />
        </div>
      </template>
    </BasePageHeader>

    <div v-if="orderbook" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-surface border border-border rounded overflow-hidden">
        <div class="px-4 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider">
          {{ $t('admin.orderbook.panelOrderbook') }}
        </div>
        <div class="overflow-x-auto">
        <table class="w-full text-sm num min-w-[420px]">
          <thead>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-3 py-2">{{ $t('admin.orderbook.thAsk') }}</th>
              <th class="text-right px-3 py-2">{{ $t('admin.orderbook.thQty') }}</th>
              <th class="text-right px-3 py-2">{{ $t('admin.orderbook.thBid') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(level, i) in orderbook.book.asks.slice(0, 5)" :key="'a'+i" class="border-b border-border last:border-0">
              <td class="px-3 py-1 text-market-up">{{ fmtPrice(level.price) }}</td>
              <td class="px-3 py-1 text-right">{{ fmtQty(level.quantity) }}</td>
              <td />
            </tr>
            <tr v-for="(level, i) in orderbook.book.bids.slice(0, 5)" :key="'b'+i" class="border-b border-border last:border-0">
              <td />
              <td class="px-3 py-1 text-right">{{ fmtQty(level.quantity) }}</td>
              <td class="px-3 py-1 text-market-down">{{ fmtPrice(level.price) }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>

      <section class="bg-surface border border-border rounded overflow-hidden">
        <div class="px-4 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider">
          {{ t('admin.orderbook.openLimits', { count: orderbook.openOrders.length }) }}
        </div>
        <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[640px]">
          <thead>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-3 py-2">{{ $t('common.label.time') }}</th>
              <th class="text-left px-3 py-2">{{ $t('common.label.user') }}</th>
              <th class="text-left px-3 py-2">{{ $t('common.label.side') }}</th>
              <th class="text-right px-3 py-2">{{ $t('common.label.price') }}</th>
              <th class="text-right px-3 py-2">{{ $t('common.label.quantity') }}</th>
            </tr>
          </thead>
          <tbody class="num">
            <tr v-if="orderbook.openOrders.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-text-muted text-xs">{{ $t('admin.orderbook.noOpen') }}</td>
            </tr>
            <tr v-for="o in orderbook.openOrders" :key="o.id"
              class="border-b border-border last:border-0"
              :class="{ 'bg-warning/10': o.isLarge }">
              <td class="px-3 py-2 text-text-muted text-xs">{{ fmtDt(o.createdAt) }}</td>
              <td class="px-3 py-2 text-xs">
                {{ o.owner?.displayName ?? '—' }}
                <div class="text-text-muted font-mono">{{ o.userId }}</div>
              </td>
              <td class="px-3 py-2 text-xs" :class="o.side === 'buy' ? 'text-market-down' : 'text-market-up'">
                {{ o.side === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
                <span v-if="o.isLarge" class="ml-1 text-[10px] px-1 bg-warning text-white rounded-sm">{{ $t('admin.orderbook.largeBadge') }}</span>
              </td>
              <td class="px-3 py-2 text-right">{{ o.price ? fmtPrice(o.price) : '—' }}</td>
              <td class="px-3 py-2 text-right">{{ fmtQty(o.quantity - o.filledQty) }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>
    </div>
  </div>
</template>
