import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useOrderStats } from '~~/app/composables/useOrderStats'
import type { Order, Trade } from '~~/shared/types'

const order: Order = {
  id: 'o1', userId: 'u1', symbol: 'BTC/TWD', side: 'buy', type: 'limit',
  price: 100, quantity: 2, filledQty: 1, avgFillPrice: 100, status: 'open',
  createdAt: '2026-05-15T10:00:00', updatedAt: '2026-05-15T10:00:00'
}

describe('useOrderStats', () => {
  it('returns a computed OrderStats reflecting refs', () => {
    const orders = ref<Order[]>([order])
    const trades = ref<Trade[]>([])
    const stats = useOrderStats(orders, trades, 'u1')
    // stats is ComputedRef<OrderStats>; .value unwraps the computed.
    // openCount.value is the plain number field on SparkSeries, not a ref.
    expect(stats.value.openCount.value).toBe(1)
    orders.value = []
    expect(stats.value.openCount.value).toBe(0)
  })
})
