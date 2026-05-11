<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'

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

const filtered = computed(() => {
  if (tab.value === 'open') return list.value.filter(o => o.status === 'open' || o.status === 'partial')
  if (tab.value === 'history') return list.value.filter(o => ['filled', 'cancelled', 'rejected'].includes(o.status))
  return list.value
})

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
      :colspan="9"
      :empty="filtered.length === 0"
      :empty-text="emptyText"
      panel-class="trader-panel overflow-hidden"
      numeric
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.symbol') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.side') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('trader.orders.th.type') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.price') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.quantity') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.filledQty') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
        </tr>
      </template>
      <tr v-for="o in filtered" :key="o.id" class="border-b border-border last:border-0">
        <td class="px-4 py-3 text-text-muted">{{ fmtDt(o.createdAt) }}</td>
        <td class="px-4 py-3 font-medium">{{ o.symbol }}</td>
        <td class="px-4 py-3" :class="o.side === 'buy' ? 'text-market-down' : 'text-market-up'">
          {{ o.side === 'buy' ? $t('side.buy') : $t('side.sell') }}
        </td>
        <td class="px-4 py-3 text-text-muted">{{ o.type }}</td>
        <td class="px-4 py-3 text-right">{{ o.price === null ? '—' : fmtPrice(o.price) }}</td>
        <td class="px-4 py-3 text-right">{{ fmtQty(o.quantity) }}</td>
        <td class="px-4 py-3 text-right text-text-muted">{{ fmtQty(o.filledQty) }}</td>
        <td class="px-4 py-3">
          <BaseBadge :variant="orderStatusVariant(o.status)" size="sm" :solid="false">
            {{ o.status }}
          </BaseBadge>
        </td>
        <td class="px-4 py-3 text-right">
          <BaseButton
            v-if="o.status === 'open' || o.status === 'partial'"
            variant="secondary"
            size="sm"
            class="!text-danger"
            @click="onCancel(o.id)"
          >
            {{ $t('trader.orders.cancelCta') }}
          </BaseButton>
          <span v-else class="text-text-muted text-xs">—</span>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>
