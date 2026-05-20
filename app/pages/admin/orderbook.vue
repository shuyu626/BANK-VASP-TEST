<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'
import { useMarketsStore } from '~/stores/markets'
import { symbolToSlug } from '~~/shared/types/symbol-slug'
import type { MarketTicker } from '~~/shared/types'

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

const ticker = computed<MarketTicker | undefined>(() =>
  markets.tickers.find((t) => t.symbol === symbol.value)
)
const base = computed(() => symbol.value.split('/')[0] ?? '')
const quote = computed(() => symbol.value.split('/')[1] ?? '')

// Top-volume chips for one-click switching. TWD pairs prioritised (台灣盤面語境).
const quickChips = computed(() => {
  const twd = markets.tickers
    .filter((t) => t.quote === 'TWD')
    .sort((a, b) => b.volume24h - a.volume24h)
  const usdt = markets.tickers
    .filter((t) => t.quote === 'USDT')
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 3)
  return [...twd, ...usdt]
})

// Spread = best ask - best bid; useful for liquidity at-a-glance.
const spread = computed(() => {
  const ask = orderbook.value?.book.asks[0]?.price
  const bid = orderbook.value?.book.bids[0]?.price
  if (ask === undefined || bid === undefined) return null
  const abs = ask - bid
  const pct = bid > 0 ? (abs / bid) * 100 : 0
  return { abs, pct }
})

const lastUpdate = computed(() => {
  const ts = orderbook.value?.book.timestamp
  if (!ts) return ''
  return ts.slice(11, 19)
})

const openOrderItems = computed(() => orderbook.value?.openOrders ?? [])

interface LadderRow {
  id: string
  askPrice: number | null
  qty: number
  bidPrice: number | null
}

const ladderRows = computed<LadderRow[]>(() => {
  if (!orderbook.value) return []
  const asks = orderbook.value.book.asks.slice(0, 5).map((level, i) => ({
    id: `a${i}`,
    askPrice: level.price,
    qty: level.quantity,
    bidPrice: null
  }))
  const bids = orderbook.value.book.bids.slice(0, 5).map((level, i) => ({
    id: `b${i}`,
    askPrice: null,
    qty: level.quantity,
    bidPrice: level.price
  }))
  return [...asks, ...bids]
})

const ladderColumns = computed(() => [
  {
    key: 'askPrice',
    label: t('admin.orderbook.thAsk'),
    headerClass: 'text-left px-3 py-2',
    cellClass: 'px-3 py-1'
  },
  {
    key: 'qty',
    label: t('admin.orderbook.thQty'),
    align: 'right' as const,
    headerClass: 'px-3 py-2',
    cellClass: 'px-3 py-1'
  },
  {
    key: 'bidPrice',
    label: t('admin.orderbook.thBid'),
    align: 'right' as const,
    headerClass: 'px-3 py-2',
    cellClass: 'px-3 py-1'
  }
])

const openOrderColumns = computed(() => [
  { key: 'createdAt', label: t('common.label.time') },
  { key: 'owner', label: t('common.label.user') },
  { key: 'side', label: t('common.label.side') },
  { key: 'price', label: t('common.label.price'), align: 'right' as const },
  { key: 'remaining', label: t('common.label.quantity'), align: 'right' as const }
])
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.orderbook.title')" />

    <!-- Symbol Hero — 一眼就能辨識當前在看哪個幣 -->
    <section class="bg-surface border border-border rounded-lg overflow-hidden">
      <div class="p-4 sm:p-5 flex flex-wrap items-center gap-4 sm:gap-6">
        <!-- Icon + base/quote 大字 -->
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-500/10 text-primary-500 text-2xl sm:text-3xl font-semibold shrink-0"
            aria-hidden="true"
          >
            {{ ticker?.icon ?? base.charAt(0) }}
          </div>
          <div class="min-w-0">
            <div class="flex items-baseline gap-1">
              <span class="text-xl sm:text-2xl font-semibold tracking-tight">{{ base }}</span>
              <span class="text-base sm:text-lg text-text-muted">/{{ quote }}</span>
            </div>
            <div class="text-xs text-text-muted truncate">
              {{ ticker?.name ?? '—' }}
              <span v-if="quote === 'TWD'" class="ml-1 px-1.5 py-0.5 bg-primary-500/10 text-primary-500 rounded text-[10px] font-medium">TWD</span>
            </div>
          </div>
        </div>

        <!-- Price + 24h change -->
        <div v-if="ticker" class="flex items-baseline gap-2 sm:border-l sm:border-border sm:pl-6">
          <span class="text-2xl sm:text-3xl font-semibold num">{{ fmtPrice(ticker.price) }}</span>
          <span
            class="text-sm font-medium num"
            :class="ticker.change24h >= 0 ? 'up' : 'down'"
          >
            {{ ticker.change24h >= 0 ? '+' : '' }}{{ ticker.change24h.toFixed(2) }}%
          </span>
        </div>

        <!-- 24h metrics -->
        <div v-if="ticker" class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-muted ml-auto">
          <div>
            <div class="uppercase tracking-wider">{{ $t('admin.orderbook.metricHigh24h') }}</div>
            <div class="num text-text mt-0.5">{{ fmtPrice(ticker.high24h) }}</div>
          </div>
          <div>
            <div class="uppercase tracking-wider">{{ $t('admin.orderbook.metricLow24h') }}</div>
            <div class="num text-text mt-0.5">{{ fmtPrice(ticker.low24h) }}</div>
          </div>
          <div>
            <div class="uppercase tracking-wider">{{ $t('admin.orderbook.metricVol24h') }}</div>
            <div class="num text-text mt-0.5">{{ fmtVolume(ticker.volume24h) }}</div>
          </div>
          <div v-if="spread">
            <div class="uppercase tracking-wider">{{ $t('admin.orderbook.spread') }}</div>
            <div class="num text-text mt-0.5">
              {{ fmtPrice(spread.abs) }}
              <span class="text-text-muted ml-1">({{ spread.pct.toFixed(3) }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 切換列：chip + 下拉 + live indicator -->
      <div class="border-t border-border bg-surface-alt/40 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs uppercase tracking-wider text-text-muted shrink-0">
          {{ $t('admin.orderbook.quickSwitch') }}
        </span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in quickChips"
            :key="t.symbol"
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
            :class="t.symbol === symbol
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'bg-surface border-border text-text-muted hover:text-text hover:border-primary-500/50'"
            @click="symbol = t.symbol"
          >
            {{ t.symbol }}
          </button>
        </div>

        <div class="ml-auto flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs text-text-muted">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span class="font-medium uppercase tracking-wider">{{ $t('admin.orderbook.live') }}</span>
            <span v-if="lastUpdate" class="num">{{ lastUpdate }}</span>
          </div>
          <div class="w-44">
            <BaseSelect
              v-model="symbol"
              :options="markets.tickers.map((t) => ({ value: t.symbol, label: t.symbol }))"
              :aria-label="$t('admin.orderbook.selectSymbol')"
            />
          </div>
        </div>
      </div>
    </section>

    <div v-if="orderbook" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-surface border border-border rounded overflow-hidden">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between">
          <span class="text-xs text-text-muted uppercase tracking-wider">
            {{ $t('admin.orderbook.panelOrderbook') }}
          </span>
          <span class="text-xs font-semibold text-text num">{{ symbol }}</span>
        </div>
        <BaseTable
          :columns="ladderColumns"
          :items="ladderRows"
          row-key="id"
          panel-class="bg-transparent border-0 rounded-none"
          table-class="text-sm num"
          table-min-width="420px"
          min-height="0"
          :empty-text="$t('admin.orderbook.noOpen')"
        >
          <template #cell-askPrice="{ row }">
            <span v-if="row.askPrice !== null" class="text-market-up">{{ fmtPrice(row.askPrice) }}</span>
          </template>
          <template #cell-qty="{ row }">{{ fmtQty(row.qty) }}</template>
          <template #cell-bidPrice="{ row }">
            <span v-if="row.bidPrice !== null" class="text-market-down">{{ fmtPrice(row.bidPrice) }}</span>
          </template>
        </BaseTable>
      </section>

      <section class="bg-surface border border-border rounded overflow-hidden">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <span class="text-xs text-text-muted uppercase tracking-wider">
            {{ t('admin.orderbook.openLimits', { count: orderbook.openOrders.length }) }}
          </span>
          <span class="text-xs font-semibold text-text num">{{ symbol }}</span>
        </div>
        <BaseTable
          :columns="openOrderColumns"
          :items="openOrderItems"
          row-key="id"
          paginated
          :default-page-size="10"
          numeric
          :empty-text="$t('admin.orderbook.noOpen')"
          panel-class="bg-transparent border-0 rounded-none"
          table-class="text-sm"
          table-min-width="640px"
          :row-class="(row) => row.isLarge ? 'bg-warning/10' : ''"
        >
          <template #cell-createdAt="{ row }">
            <span class="text-text-muted text-xs">{{ fmtDt(row.createdAt) }}</span>
          </template>
          <template #cell-owner="{ row }">
            <div class="text-xs">
              {{ row.owner?.displayName ?? '—' }}
              <div class="text-text-muted font-mono">{{ row.userId }}</div>
            </div>
          </template>
          <template #cell-side="{ row }">
            <span class="text-xs" :class="row.side === 'buy' ? 'text-market-down' : 'text-market-up'">
              {{ row.side === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
              <span v-if="row.isLarge" class="ml-1 text-[10px] px-1 bg-warning text-white rounded-sm">{{ $t('admin.orderbook.largeBadge') }}</span>
            </span>
          </template>
          <template #cell-price="{ row }">{{ row.price ? fmtPrice(row.price) : '—' }}</template>
          <template #cell-remaining="{ row }">{{ fmtQty(row.quantity - row.filledQty) }}</template>
        </BaseTable>
      </section>
    </div>

    <div v-else class="bg-surface border border-border rounded p-8 text-center text-text-muted text-sm">
      {{ $t('admin.orderbook.loading') }}
    </div>
  </div>
</template>
