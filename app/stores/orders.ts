import { defineStore } from 'pinia'
import type { Order, OrderStatus, PlaceOrderInput } from '~~/shared/types'
import { extractErrorMessage } from '~/composables/useApiResource'

interface Trade {
  id: string; symbol: string; price: number; quantity: number
  buyOrderId: string; sellOrderId: string; buyerId: string; sellerId: string
  fee: number; timestamp: string
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const trades = ref<Trade[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const open = computed(() => orders.value.filter(o => o.status === 'open'))
  const filled = computed(() => orders.value.filter(o => o.status === 'filled'))
  const cancelled = computed(() => orders.value.filter(o => o.status === 'cancelled'))

  async function load(status?: OrderStatus) {
    loading.value = true
    try {
      const res = await $fetch<{ orders: Order[] }>('/api/trader/orders', {
        query: status ? { status } : undefined,
        headers: ssrCookieHeaders()
      })
      orders.value = res.orders
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function loadTrades() {
    try {
      const res = await $fetch<{ trades: Trade[] }>('/api/trader/orders/trades', { headers: ssrCookieHeaders() })
      trades.value = res.trades
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function place(input: PlaceOrderInput): Promise<Order> {
    const res = await $fetch<{ order: Order }>('/api/trader/orders', {
      method: 'POST', body: input, headers: ssrCookieHeaders()
    })
    orders.value = [res.order, ...orders.value]
    return res.order
  }

  async function cancel(id: string): Promise<Order> {
    const res = await $fetch<{ order: Order }>(`/api/trader/orders/${id}`, {
      method: 'DELETE', headers: ssrCookieHeaders()
    })
    const i = orders.value.findIndex(o => o.id === id)
    if (i >= 0) orders.value[i] = res.order
    return res.order
  }

  return { orders, trades, loading, error, open, filled, cancelled, load, loadTrades, place, cancel }
})
