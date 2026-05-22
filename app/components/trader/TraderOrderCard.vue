<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '~~/shared/types'
import { orderRowVM } from '~/utils/order-stats'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ cancel: [id: string]; detail: [order: Order] }>()

const { t } = useI18n()
const vm = computed(() => orderRowVM(props.order))

const sideClass = computed(() =>
  props.order.side === 'buy' ? 'text-market-down' : 'text-market-up'
)
const sideLabel = computed(() =>
  props.order.side === 'buy' ? t('side.buyShort') : t('side.sellShort')
)
const typeLabel = computed(() => t(`trader.orders.orderType.${props.order.type}`))
const statusLabel = computed(() => t(`trader.orders.status.${props.order.status}`))
const notionalText = computed(() => {
  if (vm.value.notional === null) return '—'
  return vm.value.quote === 'TWD'
    ? fmtTwd(vm.value.notional)
    : fmtPrice(vm.value.notional)
})
</script>

<template>
  <div class="bg-surface border border-border rounded-md p-4">
    <div class="flex items-start justify-between">
      <div>
        <div class="font-bold">{{ order.symbol }}</div>
        <div class="text-[10px] text-text-muted num">{{ fmtDt(order.createdAt, 'minute') }}</div>
      </div>
      <BaseBadge :variant="orderStatusVariant(order.status)" size="sm" :solid="false">
        {{ statusLabel }}
      </BaseBadge>
    </div>

    <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm">
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.side') }} / {{ $t('trader.orders.th.type') }}</div>
        <div class="font-medium"><span :class="sideClass">{{ sideLabel }}</span> · {{ typeLabel }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.price') }}</div>
        <div class="font-medium num">{{ order.price === null ? $t('trader.orders.priceMarket') : fmtPrice(order.price) }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.quantity') }}</div>
        <div class="font-medium num">{{ fmtQty(order.quantity) }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('trader.orders.notional') }}</div>
        <div class="font-medium num">{{ notionalText }}</div>
      </div>
      <div class="col-span-2">
        <div class="text-[10px] uppercase tracking-wide text-text-muted">
          {{ $t('trader.orders.progress') }} · {{ vm.progressPct }}%
        </div>
        <div class="h-1.5 bg-surface-alt rounded-full overflow-hidden mt-1.5">
          <div class="h-full bg-primary-500" :style="{ width: `${vm.progressPct}%` }" />
        </div>
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <BaseButton variant="secondary" size="sm" block @click="emit('detail', order)">
        {{ $t('trader.orders.detailCta') }}
      </BaseButton>
      <BaseButton
        v-if="vm.cancelable"
        variant="secondary"
        size="sm"
        block
        tone="danger"
        @click="emit('cancel', order.id)"
      >
        {{ $t('trader.orders.cancelCta') }}
      </BaseButton>
    </div>
  </div>
</template>
