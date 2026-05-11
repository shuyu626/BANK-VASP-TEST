<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarketsStore } from '~/stores/markets'
import { symbolToSlug } from '~~/shared/types/symbol-slug'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.markets') }))

const markets = useMarketsStore()
const { tickers } = storeToRefs(markets)
await markets.loadTickers()

const { favorites, toggle, isFavorite } = useFavorites()

type Tab = 'all' | 'twd' | 'usdt' | 'fav'
const tab = ref<Tab>('all')
const search = ref('')

const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'all', label: t('trader.markets.tab.all') },
  { value: 'twd', label: 'TWD' },
  { value: 'usdt', label: 'USDT' },
  { value: 'fav', label: t('trader.markets.tab.fav') }
])

type SortKey = 'price' | 'change24h' | 'volume24h'
const sortKey = ref<SortKey>('volume24h')
const sortDesc = ref(true)

function setSort(k: SortKey) {
  if (sortKey.value === k) sortDesc.value = !sortDesc.value
  else { sortKey.value = k; sortDesc.value = true }
}

const filtered = computed(() => {
  let list = tickers.value
  if (tab.value === 'twd') list = list.filter(t => t.quote === 'TWD')
  else if (tab.value === 'usdt') list = list.filter(t => t.quote === 'USDT')
  else if (tab.value === 'fav') list = list.filter(t => favorites.value.has(t.symbol))

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.base.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    )
  }

  const key = sortKey.value
  const dir = sortDesc.value ? -1 : 1
  return [...list].sort((a, b) => (a[key] - b[key]) * dir)
})

const router = useRouter()
function goTrade(symbol: string) {
  router.push(`/trader/trade/${symbolToSlug(symbol)}`)
}

function sortIcon(k: SortKey) {
  if (sortKey.value !== k) return ''
  return sortDesc.value ? '↓' : '↑'
}

const emptyText = computed(() => tab.value === 'fav' ? t('trader.markets.emptyFav') : t('trader.markets.emptyMatch'))
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('trader.markets.title')" weight="bold">
      <template #actions>
        <div class="w-full sm:w-72 max-w-full">
          <BaseInput
            v-model="search"
            type="search"
            :placeholder="$t('trader.markets.searchPlaceholder')"
          />
        </div>
      </template>
    </BasePageHeader>

    <BaseTabBar v-model="tab" :options="tabOptions" rounded="md" />

    <BaseTable
      :colspan="6"
      :empty="filtered.length === 0"
      :empty-text="emptyText"
      panel-class="trader-panel overflow-hidden"
      numeric
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium w-8" />
          <th class="text-left px-4 py-3 font-medium">{{ $t('trader.markets.th.pair') }}</th>
          <th class="text-right px-4 py-3 font-medium cursor-pointer hover:text-text" @click="setSort('price')">
            {{ $t('trader.markets.th.lastPrice') }} {{ sortIcon('price') }}
          </th>
          <th class="text-right px-4 py-3 font-medium cursor-pointer hover:text-text" @click="setSort('change24h')">
            {{ $t('trader.markets.th.change24h') }} {{ sortIcon('change24h') }}
          </th>
          <th class="text-right px-4 py-3 font-medium cursor-pointer hover:text-text" @click="setSort('volume24h')">
            {{ $t('trader.markets.th.vol24h') }} {{ sortIcon('volume24h') }}
          </th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('trader.markets.th.highLow') }}</th>
        </tr>
      </template>
      <tr
        v-for="m in filtered"
        :key="m.symbol"
        class="border-b border-border last:border-0 hover:bg-surface-alt cursor-pointer"
        @click="goTrade(m.symbol)"
      >
        <td class="px-4 py-3" @click.stop>
          <button type="button" class="text-text-muted hover:text-gold-400" @click="toggle(m.symbol)">
            {{ isFavorite(m.symbol) ? '★' : '☆' }}
          </button>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-alt text-primary-400 font-bold">
              {{ m.icon }}
            </span>
            <div>
              <div class="font-medium">{{ m.symbol }}</div>
              <div class="text-xs text-text-muted">{{ m.name }}</div>
            </div>
          </div>
        </td>
        <td class="text-right px-4 py-3">{{ fmtPriceAdaptive(m.price) }}</td>
        <td class="text-right px-4 py-3 font-medium" :class="m.change24h >= 0 ? 'up' : 'down'">
          {{ m.change24h >= 0 ? '+' : '' }}{{ m.change24h.toFixed(2) }}%
        </td>
        <td class="text-right px-4 py-3 text-text-muted">{{ fmtVolume(m.volume24h) }}</td>
        <td class="text-right px-4 py-3 text-text-muted text-xs">
          {{ fmtPriceAdaptive(m.high24h) }} / {{ fmtPriceAdaptive(m.low24h) }}
        </td>
      </tr>
    </BaseTable>
  </div>
</template>
