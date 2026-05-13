<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import type { TableColumn } from '~/components/common/BaseTable.vue'
import type { Order } from '~~/shared/types'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.orders') }))

const orders = useOrdersStore()
const { orders: list, loading } = storeToRefs(orders)
await orders.load()

type Tab = 'all' | 'open' | 'history'
const tab = ref<Tab>('all')
const toast = useToast()

const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'all', label: t('trader.orders.tab.all') },
  { value: 'open', label: t('trader.orders.tab.open') },
  { value: 'history', label: t('trader.orders.tab.history') }
])

const filtered = computed<Order[]>(() => {
  if (tab.value === 'open') return list.value.filter(o => o.status === 'open' || o.status === 'partial')
  if (tab.value === 'history') return list.value.filter(o => ['filled', 'cancelled', 'rejected'].includes(o.status))
  return list.value
})

const columns = computed<TableColumn[]>(() => [
  { key: 'createdAt', label: t('common.label.time') },
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'side', label: t('common.label.side') },
  { key: 'type', label: t('trader.orders.th.type') },
  { key: 'price', label: t('common.label.price'), align: 'right' },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' },
  { key: 'filledQty', label: t('common.label.filledQty'), align: 'right' },
  { key: 'status', label: t('common.label.status') },
  { key: 'actions', label: t('common.label.action'), align: 'right' }
])

async function onCancel(id: string) {
  try {
    await orders.cancel(id)
    toast.success(t('trader.orders.cancelSuccess'))
  } catch (err: unknown) {
    toast.error(extract(err))
  }
}

function extract(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? t('trader.orders.cancelError')
  }
  return t('trader.orders.cancelError')
}

const emptyText = computed(() =>
  tab.value === 'open' ? t('trader.orders.emptyOpen')
  : tab.value === 'history' ? t('trader.orders.emptyHistory')
  : t('trader.orders.emptyAll')
)
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('trader.orders.title')" weight="bold">
      <template #actions>
        <NuxtLink to="/trader/orders/trades" class="text-sm text-primary-400 hover:text-primary-300">
          {{ $t('trader.orders.tradesLink') }}
        </NuxtLink>
      </template>
    </BasePageHeader>

    <div class="flex items-center">
      <BaseTabBar v-model="tab" :options="tabOptions" rounded="md" />
      <BaseButton
        variant="ghost"
        size="sm"
        class="ml-auto"
        :disabled="loading"
        @click="orders.load()"
      >
        {{ $t('common.action.refresh') }}
      </BaseButton>
    </div>

    <BaseTable
      :columns="columns"
      :items="filtered"
      row-key="id"
      paginated
      :default-page-size="20"
      :page-size-options="[10, 20, 50, 100]"
      :empty-text="emptyText"
      panel-class="trader-panel overflow-hidden"
      numeric
    >
      <template #cell-createdAt="{ row }">
        <span class="text-text-muted">{{ fmtDt(row.createdAt) }}</span>
      </template>
      <template #cell-symbol="{ row }">
        <span class="font-medium">{{ row.symbol }}</span>
      </template>
      <template #cell-side="{ row }">
        <span :class="row.side === 'buy' ? 'text-market-down' : 'text-market-up'">
          {{ row.side === 'buy' ? $t('side.buy') : $t('side.sell') }}
        </span>
      </template>
      <template #cell-type="{ row }">
        <span class="text-text-muted">{{ row.type }}</span>
      </template>
      <template #cell-price="{ row }">
        {{ row.price === null ? '—' : fmtPrice(row.price) }}
      </template>
      <template #cell-quantity="{ row }">{{ fmtQty(row.quantity) }}</template>
      <template #cell-filledQty="{ row }">
        <span class="text-text-muted">{{ fmtQty(row.filledQty) }}</span>
      </template>
      <template #cell-status="{ row }">
        <BaseBadge :variant="orderStatusVariant(row.status)" size="sm" :solid="false">
          {{ row.status }}
        </BaseBadge>
      </template>
      <template #cell-actions="{ row }">
        <BaseButton
          v-if="row.status === 'open' || row.status === 'partial'"
          variant="secondary"
          size="sm"
          class="!text-danger"
          @click="onCancel(row.id)"
        >
          {{ $t('trader.orders.cancelCta') }}
        </BaseButton>
        <span v-else class="text-text-muted text-xs">—</span>
      </template>
    </BaseTable>
  </div>
</template>
