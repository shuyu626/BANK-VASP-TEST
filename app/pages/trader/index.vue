<script setup lang="ts">
import { mockMarkets, mockMarketsTwd } from '~/utils/mock'

definePageMeta({ layout: 'trader' })

const { t } = useI18n()
useHead(() => ({ title: t('trader.head.home') }))

const hotPairs = computed(() => [...mockMarketsTwd, ...mockMarkets.slice(0, 4)])

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
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-4 py-3 font-medium">{{ $t('trader.markets.th.pair') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('trader.markets.th.lastPrice') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('trader.markets.th.change24h') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('trader.home.thHigh') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('trader.home.thLow') }}</th>
            </tr>
          </thead>
          <tbody class="num">
            <tr
              v-for="m in hotPairs"
              :key="m.symbol"
              class="border-b border-border last:border-0 hover:bg-surface-alt transition cursor-pointer"
            >
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
              <td class="text-right px-4 py-3">{{ formatPrice(m.price) }}</td>
              <td
                class="text-right px-4 py-3 font-medium"
                :class="m.change24h >= 0 ? 'up' : 'down'"
              >
                {{ m.change24h >= 0 ? '+' : '' }}{{ m.change24h.toFixed(2) }}%
              </td>
              <td class="text-right px-4 py-3 text-text-muted">{{ formatPrice(m.high24h) }}</td>
              <td class="text-right px-4 py-3 text-text-muted">{{ formatPrice(m.low24h) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
