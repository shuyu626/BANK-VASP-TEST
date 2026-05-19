<script setup lang="ts">
import { mockMarkets, mockMarketsTwd } from '~/utils/mock'

definePageMeta({ layout: 'trader' })

const { t } = useI18n()
useHead(() => ({ title: t('trader.head.home') }))

const hotPairs = computed(() => [...mockMarketsTwd, ...mockMarkets.slice(0, 4)])

const hotMarketColumns = computed(() => [
  { key: 'symbol', label: t('trader.markets.th.pair') },
  { key: 'price', label: t('trader.markets.th.lastPrice'), align: 'right' as const },
  { key: 'change24h', label: t('trader.markets.th.change24h'), align: 'right' as const },
  { key: 'high24h', label: t('trader.home.thHigh'), align: 'right' as const },
  { key: 'low24h', label: t('trader.home.thLow'), align: 'right' as const }
])

function formatPrice(p: number) {
  return p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.toFixed(4)
}
</script>

<template>
  <div class="space-y-10">
    <section class="trader-panel p-6 sm:p-8">
      <div class="text-xs tracking-widest uppercase text-primary-400 mb-3">{{ $t('trader.home.spotKicker') }}</div>
      <h1 class="text-2xl sm:text-3xl font-bold mb-3">{{ $t('trader.home.heroTitle1') }}<span class="text-primary-500">{{ $t('trader.home.heroTitle2') }}</span></h1>
      <p class="text-text-muted max-w-xl leading-relaxed mb-6">
        {{ $t('trader.home.heroDesc') }}
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/trader/register" class="trader-cta">{{ $t('trader.home.openAccount') }}</NuxtLink>
        <NuxtLink to="/trader/markets" class="px-5 py-3 rounded-lg border border-border hover:bg-surface-alt transition">
          {{ $t('trader.home.browseMarkets') }}
        </NuxtLink>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">{{ $t('trader.home.hotMarkets') }}</h2>
        <NuxtLink to="/trader/markets" class="text-sm text-primary-400 hover:text-primary-300">
          {{ $t('trader.home.viewAll') }}
        </NuxtLink>
      </div>
      <div class="trader-panel overflow-x-auto">
        <BaseTable
          :columns="hotMarketColumns"
          :items="hotPairs"
          row-key="symbol"
          numeric
          panel-class="bg-transparent border-0 rounded-none"
          row-class="hover:bg-surface-alt transition"
        >
          <template #cell-symbol="{ row }">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-alt text-primary-400 font-bold">
                {{ row.icon }}
              </span>
              <div>
                <div class="font-medium">{{ row.symbol }}</div>
                <div class="text-xs text-text-muted">{{ row.name }}</div>
              </div>
            </div>
          </template>
          <template #cell-price="{ row }">{{ formatPrice(row.price) }}</template>
          <template #cell-change24h="{ row }">
            <span class="font-medium" :class="row.change24h >= 0 ? 'up' : 'down'">
              {{ row.change24h >= 0 ? '+' : '' }}{{ row.change24h.toFixed(2) }}%
            </span>
          </template>
          <template #cell-high24h="{ row }">
            <span class="text-text-muted">{{ formatPrice(row.high24h) }}</span>
          </template>
          <template #cell-low24h="{ row }">
            <span class="text-text-muted">{{ formatPrice(row.low24h) }}</span>
          </template>
        </BaseTable>
      </div>
    </section>
  </div>
</template>
