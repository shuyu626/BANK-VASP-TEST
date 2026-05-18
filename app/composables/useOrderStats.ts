import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Order, Trade } from '~~/shared/types'
import { computeOrderStats, type OrderStats } from '~/utils/order-stats'

export function useOrderStats(
  orders: Ref<Order[]>,
  trades: Ref<Trade[]>,
  seedKey: string
): ComputedRef<OrderStats> {
  return computed<OrderStats>(() =>
    computeOrderStats(orders.value, trades.value, new Date(), seedKey)
  )
}
