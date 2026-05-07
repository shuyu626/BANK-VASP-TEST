import { defineStore } from 'pinia'
import type { MarketTicker, KlinePoint, OrderBookSnapshot } from '~~/shared/types'
import { extractErrorMessage } from '~/composables/useApiResource'

interface Trade {
  id: string; symbol: string; price: number; quantity: number; side: 'buy' | 'sell'; timestamp: string
}

export const useMarketsStore = defineStore('markets', () => {
  const tickers = ref<MarketTicker[]>([])
  const klines = ref<Record<string, KlinePoint[]>>({})
  const orderbooks = ref<Record<string, OrderBookSnapshot>>({})
  const recentTrades = ref<Record<string, Trade[]>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  const bySymbol = (symbol: string) => tickers.value.find(t => t.symbol === symbol)

  async function loadTickers() {
    loading.value = true
    try {
      const res = await $fetch<{ tickers: MarketTicker[] }>('/api/trader/markets', { headers: ssrCookieHeaders() })
      tickers.value = res.tickers
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function loadKlines(symbol: string, interval = '15m') {
    try {
      const slug = symbol.replace('/', '-')
      const res = await $fetch<{ klines: KlinePoint[] }>(`/api/trader/markets/${slug}/klines`, {
        query: { interval }, headers: ssrCookieHeaders()
      })
      klines.value[symbol] = res.klines
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function loadOrderbook(symbol: string) {
    try {
      const slug = symbol.replace('/', '-')
      const book = await $fetch<OrderBookSnapshot>(`/api/trader/markets/${slug}/orderbook`, { headers: ssrCookieHeaders() })
      orderbooks.value[symbol] = book
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function loadTrades(symbol: string) {
    try {
      const slug = symbol.replace('/', '-')
      const res = await $fetch<{ trades: Trade[] }>(`/api/trader/markets/${slug}/trades`, { headers: ssrCookieHeaders() })
      recentTrades.value[symbol] = res.trades
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  return { tickers, klines, orderbooks, recentTrades, loading, error, bySymbol, loadTickers, loadKlines, loadOrderbook, loadTrades }
})
