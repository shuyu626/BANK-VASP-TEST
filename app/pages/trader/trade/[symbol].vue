<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarketsStore } from '~/stores/markets'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import { useWalletStore } from '~/stores/wallet'
import { symbolFromSlug, symbolToSlug } from '~~/shared/types/symbol-slug'
import type { OrderSide, OrderType } from '~~/shared/types'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()

const route = useRoute()
const slug = computed(() => String(route.params.symbol))
const symbol = computed(() => symbolFromSlug(slug.value))

useHead(() => ({ title: t('trader.head.trade', { symbol: symbol.value }) }))

const markets = useMarketsStore()
const orders = useOrdersStore()
const session = useSessionStore()
const wallet = useWalletStore()
const { tickers, klines, orderbooks, recentTrades } = storeToRefs(markets)
const { kycStatus } = storeToRefs(session)
const { holdings, fiatAvailable } = storeToRefs(wallet)

const interval = ref<'15m' | '1h' | '4h' | '1D'>('15m')
const chartType = ref<'candle' | 'line' | 'area'>('candle')
const showVolume = ref(true)
const showMa = ref(true)

// Initial loads
await markets.loadTickers()
await Promise.all([
  markets.loadKlines(symbol.value, interval.value),
  markets.loadOrderbook(symbol.value),
  markets.loadTrades(symbol.value),
  wallet.loadSnapshot()
])

const ticker = computed(() => tickers.value.find(t => t.symbol === symbol.value))
const currentKlines = computed(() => klines.value[symbol.value] ?? [])
const orderbook = computed(() => orderbooks.value[symbol.value] ?? { bids: [], asks: [], symbol: symbol.value, timestamp: '' })
const trades = computed(() => recentTrades.value[symbol.value] ?? [])
const base = computed(() => symbol.value.split('/')[0] ?? '')
const quote = computed(() => (symbol.value.split('/')[1] ?? '') as 'TWD' | 'USDT')
const midPrice = computed(() => ticker.value?.price ?? 0)
const baseHolding = computed(() => holdings.value.find(h => h.symbol === base.value)?.amount ?? 0)

const formAvailable = computed(() => {
  if (quote.value === 'TWD') return fiatAvailable.value
  return holdings.value.find(h => h.symbol === quote.value)?.amount ?? 0
})

function fmtPrice(p: number) {
  return p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toFixed(4)
}
function fmtVol(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(0)
}

watch(interval, (i) => markets.loadKlines(symbol.value, i))
watch(symbol, async (s) => {
  await Promise.all([
    markets.loadKlines(s, interval.value),
    markets.loadOrderbook(s),
    markets.loadTrades(s)
  ])
})

// Periodic refresh
let refreshHandle: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshHandle = setInterval(async () => {
    await Promise.all([
      markets.loadOrderbook(symbol.value),
      markets.loadTrades(symbol.value)
    ])
  }, 3000)
})
onBeforeUnmount(() => {
  if (refreshHandle) clearInterval(refreshHandle)
})

// Order form submission
const orderFormRef = ref<{ fillPrice: (p: number, s: OrderSide) => void } | null>(null)
const toast = ref<{ type: 'success' | 'error'; msg: string } | null>(null)

async function onSubmitOrder(payload: { side: OrderSide; type: OrderType; price: number | null; quantity: number }) {
  try {
    const order = await orders.place({
      symbol: symbol.value,
      side: payload.side,
      type: payload.type,
      price: payload.price,
      quantity: payload.quantity
    })
    toast.value = { type: 'success', msg: order.status === 'filled' ? t('trader.trade.filledImmediately') : t('trader.trade.queued') }
    await Promise.all([markets.loadOrderbook(symbol.value), wallet.refresh()])
  } catch (err: unknown) {
    toast.value = { type: 'error', msg: extractMsg(err) }
  }
  setTimeout(() => { toast.value = null }, 3000)
}

function onPick(p: { price: number; side: OrderSide }) {
  orderFormRef.value?.fillPrice(p.price, p.side)
}

function extractMsg(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { statusMessage?: string; message?: string }
    return humanize(e.statusMessage ?? e.message ?? t('trader.trade.submitFailed'))
  }
  return t('trader.trade.submitFailed')
}
function humanize(c: string) {
  switch (c) {
    case 'INSUFFICIENT_BALANCE': return t('trader.trade.errInsufficientBalance')
    case 'INSUFFICIENT_HOLDING': return t('trader.trade.errInsufficientHolding')
    case 'KYC_NOT_APPROVED': return t('trader.trade.errKycNotApproved')
    default: return c
  }
}

// Quick symbol switch
const router = useRouter()
function switchTo(s: string) {
  router.push(`/trader/trade/${symbolToSlug(s)}`)
}

// Favorite toggle
const { toggle: toggleFavorite, isFavorite } = useFavorites()

// My open orders on this symbol (inline widget)
await orders.load()
const { orders: allOrders } = storeToRefs(orders)
const myOpenOnSymbol = computed(() =>
  allOrders.value.filter(o => o.symbol === symbol.value && (o.status === 'open' || o.status === 'partial'))
)

const myOpenOrderColumns = computed(() => [
  { key: 'createdAt', label: t('common.label.time') },
  { key: 'type', label: t('trader.orders.th.type') },
  { key: 'side', label: t('common.label.side') },
  { key: 'price', label: t('common.label.price'), align: 'right' as const },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' as const },
  { key: 'filledQty', label: t('common.label.filledQty'), align: 'right' as const },
  { key: 'actions', label: '', align: 'right' as const }
])

async function cancelMy(id: string) {
  try {
    await orders.cancel(id)
    await Promise.all([markets.loadOrderbook(symbol.value), orders.load()])
    toast.value = { type: 'success', msg: t('trader.trade.cancelSuccess') }
  } catch (err: unknown) {
    toast.value = { type: 'error', msg: extractMsg(err) }
  }
  setTimeout(() => { toast.value = null }, 2500)
}

function fmtOrderQty(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}
function fmtDt(iso: string) { return iso.slice(5, 16).replace('T', ' ') }

// Refresh orders also on periodic tick
watch(() => orders.orders.length, () => { /* no-op keep reactive */ })
</script>

<template>
  <div v-if="!ticker" class="max-w-xl mx-auto text-center py-16">
    <h1 class="text-2xl font-bold mb-2">{{ $t('trader.trade.notFoundTitle') }}</h1>
    <p class="text-text-muted mb-6">{{ symbol }}</p>
    <NuxtLink to="/trader/markets" class="trader-cta">{{ $t('trader.trade.backToMarkets') }}</NuxtLink>
  </div>

  <div v-else class="space-y-4">
    <!-- Price panel + symbol switcher -->
    <section class="trader-panel p-4 flex items-center gap-3 sm:gap-6 flex-wrap">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="text-xl leading-none"
          :class="isFavorite(symbol) ? 'text-gold-400' : 'text-text-muted hover:text-gold-400'"
          :title="isFavorite(symbol) ? t('trader.trade.favTooltipRemove') : t('trader.trade.favTooltipAdd')"
          @click="toggleFavorite(symbol)"
        >
          {{ isFavorite(symbol) ? '★' : '☆' }}
        </button>
        <select
          :value="symbol"
          class="bg-surface-alt border border-border rounded px-2 sm:px-3 py-2 font-semibold text-base sm:text-lg focus:outline-none"
          @change="(e) => switchTo((e.target as HTMLSelectElement).value)"
        >
          <option v-for="t in tickers" :key="t.symbol" :value="t.symbol">
            {{ t.symbol }}
          </option>
        </select>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl sm:text-2xl font-semibold num">{{ fmtPrice(ticker.price) }}</span>
        <span class="text-sm num" :class="ticker.change24h >= 0 ? 'up' : 'down'">
          {{ ticker.change24h >= 0 ? '+' : '' }}{{ ticker.change24h.toFixed(2) }}%
        </span>
      </div>
      <div class="basis-full md:basis-auto md:ml-auto flex flex-wrap gap-x-4 gap-y-1 sm:gap-6 text-xs text-text-muted">
        <div>{{ $t('trader.trade.metricHigh24h') }} <span class="num text-text">{{ fmtPrice(ticker.high24h) }}</span></div>
        <div>{{ $t('trader.trade.metricLow24h') }} <span class="num text-text">{{ fmtPrice(ticker.low24h) }}</span></div>
        <div>{{ $t('trader.trade.metricVol24h') }} <span class="num text-text">{{ fmtVol(ticker.volume24h) }}</span></div>
      </div>
    </section>

    <!-- My open orders on this symbol -->
    <section v-if="myOpenOnSymbol.length > 0" class="trader-panel overflow-hidden">
      <div class="px-4 py-2 border-b border-border flex items-center justify-between text-xs">
        <div class="text-text-muted uppercase tracking-wider">
          {{ $t('trader.trade.myOpenOrders') }} <span class="text-primary-400 ml-1">{{ myOpenOnSymbol.length }}</span>
        </div>
        <NuxtLink to="/trader/orders" class="text-primary-400 hover:text-primary-300">{{ $t('trader.trade.allOrders') }}</NuxtLink>
      </div>
      <div class="overflow-x-auto">
        <BaseTable
          :columns="myOpenOrderColumns"
          :items="myOpenOnSymbol"
          row-key="id"
          paginated
          :default-page-size="10"
          numeric
          panel-class="bg-transparent border-0 rounded-none"
          table-class="text-xs"
        >
          <template #cell-createdAt="{ row }">
            <span class="text-text-muted">{{ fmtDt(row.createdAt) }}</span>
          </template>
          <template #cell-side="{ row }">
            <span :class="row.side === 'buy' ? 'text-market-down' : 'text-market-up'">
              {{ row.side === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
            </span>
          </template>
          <template #cell-price="{ row }">{{ row.price ? fmtPrice(row.price) : '—' }}</template>
          <template #cell-quantity="{ row }">{{ fmtOrderQty(row.quantity) }}</template>
          <template #cell-filledQty="{ row }">
            <span class="text-text-muted">{{ fmtOrderQty(row.filledQty) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <BaseButton variant="secondary" size="sm" tone="danger" @click="cancelMy(row.id)">
              {{ $t('trader.orders.cancelCta') }}
            </BaseButton>
          </template>
        </BaseTable>
      </div>
    </section>

    <!--
      RWD 階梯：
      - mobile：單欄（chart → orderbook → orderform 直疊）
      - lg (≥1024)：chart 跨兩欄上方，orderbook / orderform 兩欄並排
      - xl (≥1280)：三欄並排（chart 用 minmax(0,1fr) 才不會被內容撐爆軌道）
    -->
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_320px_280px] gap-4">
      <!-- Chart + controls -->
      <section class="space-y-3 min-w-0 lg:col-span-2 xl:col-span-1">
        <div class="trader-panel">
          <div class="px-4 py-2 border-b border-border flex items-center flex-wrap gap-2 text-xs">
            <!-- Interval -->
            <div class="flex items-center gap-1 flex-wrap">
              <span class="text-text-muted mr-1">{{ $t('common.label.time') }}</span>
              <button
                v-for="i in (['15m','1h','4h','1D'] as const)"
                :key="i"
                type="button"
                class="px-2.5 py-1 rounded transition"
                :class="interval === i ? 'bg-primary-500 text-white' : 'text-text-muted hover:bg-surface-alt'"
                @click="interval = i"
              >{{ i }}</button>
            </div>

            <div class="w-px h-4 bg-border mx-1" />

            <!-- Chart type -->
            <div class="flex items-center gap-1 flex-wrap">
              <span class="text-text-muted mr-1">{{ $t('trader.orders.th.type') }}</span>
              <button
                v-for="c in (['candle','line','area'] as const)"
                :key="c"
                type="button"
                class="px-2.5 py-1 rounded transition"
                :class="chartType === c ? 'bg-primary-500 text-white' : 'text-text-muted hover:bg-surface-alt'"
                @click="chartType = c"
              >{{ $t(`trader.trade.chartLabel.${c}`) }}</button>
            </div>

            <div class="w-px h-4 bg-border mx-1" />

            <!-- Indicators -->
            <button
              type="button"
              class="px-2.5 py-1 rounded transition"
              :class="showMa ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'text-text-muted hover:bg-surface-alt border border-border'"
              @click="showMa = !showMa"
            >MA</button>
            <button
              type="button"
              class="px-2.5 py-1 rounded transition"
              :class="showVolume ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'text-text-muted hover:bg-surface-alt border border-border'"
              @click="showVolume = !showVolume"
            >Vol</button>

            <!-- MA legend when active -->
            <div v-if="showMa" class="ml-auto flex items-center gap-3 text-[10px] num">
              <span class="text-gold-400">MA7</span>
              <span class="text-primary-400">MA25</span>
              <span class="text-neutral-400">MA99</span>
            </div>
          </div>
          <div class="p-2">
            <ClientOnly>
              <LazyTraderKlineChart
                :data="currentKlines"
                :height="420"
                :chart-type="chartType"
                :show-volume="showVolume"
                :show-ma="showMa"
              />
              <template #fallback>
                <div class="h-[420px] flex items-center justify-center text-text-muted text-sm">
                  {{ $t('trader.trade.klineLoading') }}
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <TraderRecentTrades :trades="trades" />
      </section>

      <!-- Order book -->
      <section class="min-w-0">
        <TraderOrderBook
          :bids="orderbook.bids"
          :asks="orderbook.asks"
          :mid-price="midPrice"
          @pick="onPick"
        />
      </section>

      <!-- Order form -->
      <section class="min-w-0">
        <TraderOrderForm
          ref="orderFormRef"
          :symbol="symbol"
          :mid-price="midPrice"
          :fiat-available="formAvailable"
          :base-holding="baseHolding"
          :kyc-approved="kycStatus === 'approved'"
          :quote="quote"
          :base="base"
          @submit="onSubmitOrder"
        />
      </section>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="toast"
        class="fixed bottom-6 right-6 px-4 py-3 rounded-md shadow-lg z-30 text-sm"
        :class="toast.type === 'success' ? 'bg-primary-500 text-white' : 'bg-danger text-white'"
      >
        {{ toast.msg }}
      </div>
    </Teleport>
  </div>
</template>
