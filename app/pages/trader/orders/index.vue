<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import { useOrderStats } from '~/composables/useOrderStats'
import { orderRowVM } from '~/utils/order-stats'
import type { TableColumn } from '~/components/common/BaseTable.vue'
import type { Order } from '~~/shared/types'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.orders') }))

const orders = useOrdersStore()
const session = useSessionStore()
const { orders: list, trades, loading } = storeToRefs(orders)
await Promise.all([orders.load(), orders.loadTrades()])

const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()

const stats = useOrderStats(list, trades, session.user?.id ?? 'anon')

type Tab = 'open' | 'history'
const tab = ref<Tab>('open')
const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'open', label: t('trader.orders.tab.open') },
  { value: 'history', label: t('trader.orders.tab.history') }
])

const symbolFilter = ref<string>('ALL')
const symbolOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const o of list.value) counts.set(o.symbol, (counts.get(o.symbol) ?? 0) + 1)
  const opts = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sym, c]) => ({ value: sym, label: t('trader.orders.filter.withCount', { symbol: sym, count: c }) }))
  return [{ value: 'ALL', label: t('trader.orders.filter.allSymbols') }, ...opts]
})

const filtered = computed<Order[]>(() => {
  let l = list.value
  l = tab.value === 'open'
    ? l.filter(o => o.status === 'open' || o.status === 'partial')
    : l.filter(o => ['filled', 'cancelled', 'rejected'].includes(o.status))
  if (symbolFilter.value !== 'ALL') l = l.filter(o => o.symbol === symbolFilter.value)
  return l
})

const cancelableInView = computed(() => filtered.value.filter(o => orderRowVM(o).cancelable))

const columns = computed<TableColumn[]>(() => [
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'sideType', label: `${t('common.label.side')} / ${t('trader.orders.th.type')}` },
  { key: 'price', label: t('common.label.price'), align: 'right' },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' },
  { key: 'progress', label: t('trader.orders.progress') },
  { key: 'notional', label: t('trader.orders.notional'), align: 'right' },
  { key: 'status', label: t('common.label.status') },
  { key: 'actions', label: t('common.label.action'), align: 'right' }
])

function vmOf(o: Order) { return orderRowVM(o) }
function notionalText(o: Order): string {
  const vm = orderRowVM(o)
  if (vm.notional === null) return '—'
  return vm.quote === 'TWD' ? fmtTwd(vm.notional) : fmtPrice(vm.notional)
}

async function onCancel(id: string) {
  try {
    await orders.cancel(id)
    toast.success(t('trader.orders.cancelSuccess'))
  } catch (err: unknown) {
    toast.error(extractErr(err))
  }
}

async function onCancelAll() {
  const targets = cancelableInView.value
  if (targets.length === 0) return
  const ok = await confirm({
    message: t('trader.orders.cancelAllConfirm', { count: targets.length }),
    variant: 'danger'
  })
  if (!ok) return
  let done = 0; let fail = 0
  for (const o of targets) {
    try { await orders.cancel(o.id); done++ } catch { fail++ }
  }
  toast.success(t('trader.orders.cancelAllDone', { ok: done, fail }))
}

function extractErr(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? t('trader.orders.cancelError')
  }
  return t('trader.orders.cancelError')
}

const emptyText = computed(() =>
  tab.value === 'open' ? t('trader.orders.emptyOpen') : t('trader.orders.emptyHistory')
)

// ─── 訂單明細 modal ───
const detailOpen = ref(false)
const detailOrder = ref<Order | null>(null)
function openDetail(o: Order) { detailOrder.value = o; detailOpen.value = true }
const detailVm = computed(() => detailOrder.value ? orderRowVM(detailOrder.value) : null)

function onTabBar(v: Tab | 'trades') {
  if (v === 'trades') { router.push('/trader/orders/trades'); return }
  tab.value = v
}
</script>

<template>
  <div class="space-y-5">
    <BasePageHeader :title="$t('trader.orders.title')" weight="bold" />

    <!-- KPI -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.openCount')"
        :value="`${stats.openCount.value} ${$t('trader.orders.kpi.unitOrders')}`"
        :series="stats.openCount.series"
        :delta="stats.openCount.delta"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.openNotional')"
        :value="fmtTwd(stats.openNotional.value)"
        :series="stats.openNotional.series"
        :delta="stats.openNotional.delta"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.filledToday')"
        :value="`${stats.filledToday.value} ${$t('trader.orders.kpi.unitOrders')}`"
        :series="stats.filledToday.series"
        :delta="stats.filledToday.delta"
        tone="neutral"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.fee30d')"
        :value="fmtTwd(stats.fee30d.value)"
        :series="stats.fee30d.series"
        :delta="stats.fee30d.delta"
        tone="neutral"
      />
    </div>

    <!-- tab + toolbar -->
    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <div class="flex gap-1 text-sm">
        <button
          v-for="opt in [...tabOptions, { value: 'trades' as const, label: $t('trader.orders.tab.trades') }]"
          :key="opt.value"
          type="button"
          class="px-4 py-2 rounded-md transition"
          :class="opt.value === tab ? 'bg-brand text-white' : 'text-text-muted hover:text-text hover:bg-surface-alt'"
          @click="onTabBar(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="flex items-center gap-2 md:ml-auto">
        <div class="w-full md:w-52">
          <BaseSelect
            v-model="symbolFilter"
            :options="symbolOptions"
            :label="undefined"
            size="sm"
          />
        </div>
        <BaseButton
          v-if="tab === 'open' && cancelableInView.length > 0"
          variant="secondary"
          size="sm"
          class="!text-danger shrink-0"
          @click="onCancelAll"
        >
          {{ $t('trader.orders.cancelAll', { count: cancelableInView.length }) }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" class="shrink-0" :disabled="loading" @click="orders.load()">
          {{ $t('common.action.refresh') }}
        </BaseButton>
      </div>
    </div>

    <!-- 桌機 / 平板：表格 -->
    <div class="hidden md:block">
      <BaseTable
        :columns="columns"
        :items="filtered"
        row-key="id"
        paginated
        :default-page-size="20"
        :page-size-options="[5, 10, 20, 50]"
        :empty-text="emptyText"
        panel-class="trader-panel overflow-hidden"
        numeric
      >
        <template #cell-symbol="{ row }">
          <div class="font-medium">{{ row.symbol }}</div>
          <div class="text-[10px] text-text-muted num">{{ fmtDt(row.createdAt, 'minute') }}</div>
        </template>
        <template #cell-sideType="{ row }">
          <span :class="row.side === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ row.side === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
          <span class="text-text-muted"> · {{ $t(`trader.orders.orderType.${row.type}`) }}</span>
        </template>
        <template #cell-price="{ row }">
          {{ row.price === null ? $t('trader.orders.priceMarket') : fmtPrice(row.price) }}
        </template>
        <template #cell-quantity="{ row }">{{ fmtQty(row.quantity) }}</template>
        <template #cell-progress="{ row }">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-20 bg-surface-alt rounded-full overflow-hidden">
              <div class="h-full bg-primary-500" :style="{ width: `${vmOf(row).progressPct}%` }" />
            </div>
            <span class="text-text-muted text-xs num">{{ vmOf(row).progressPct }}%</span>
          </div>
        </template>
        <template #cell-notional="{ row }">{{ notionalText(row) }}</template>
        <template #cell-status="{ row }">
          <BaseBadge :variant="orderStatusVariant(row.status)" size="sm" :solid="false">
            {{ $t(`trader.orders.status.${row.status}`) }}
          </BaseBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="text-xs text-primary-400 hover:text-primary-300" @click="openDetail(row)">
              {{ $t('trader.orders.detailCta') }}
            </button>
            <BaseButton
              v-if="vmOf(row).cancelable"
              variant="secondary"
              size="sm"
              class="!text-danger"
              @click="onCancel(row.id)"
            >
              {{ $t('trader.orders.cancelCta') }}
            </BaseButton>
          </div>
        </template>
      </BaseTable>
    </div>

    <!-- 手機：卡片 -->
    <div class="md:hidden space-y-3">
      <p v-if="filtered.length === 0" class="text-center text-text-muted py-10">{{ emptyText }}</p>
      <TraderOrderCard
        v-for="o in filtered"
        :key="o.id"
        :order="o"
        @cancel="onCancel"
        @detail="openDetail"
      />
    </div>

    <!-- 明細 modal -->
    <BaseModal v-model="detailOpen" :title="detailOrder ? $t('trader.orders.detail.title', { symbol: detailOrder.symbol }) : ''" width="md">
      <BaseDescriptionList
        v-if="detailOrder && detailVm"
        :items="[
          { label: $t('trader.orders.detail.orderId'), value: detailOrder.id },
          { label: $t('trader.orders.detail.createdAt'), value: fmtDt(detailOrder.createdAt) },
          { label: $t('trader.orders.detail.updatedAt'), value: fmtDt(detailOrder.updatedAt) },
          { label: $t('trader.orders.detail.avgFill'), value: detailOrder.avgFillPrice === null ? '—' : fmtPrice(detailOrder.avgFillPrice) },
          { label: $t('trader.orders.detail.filled'), value: `${fmtQty(detailOrder.filledQty)} / ${fmtQty(detailOrder.quantity)}` },
          { label: $t('trader.orders.detail.remaining'), value: fmtQty(Math.max(0, detailOrder.quantity - detailOrder.filledQty)) },
          { label: $t('trader.orders.notional'), value: notionalText(detailOrder) }
        ]"
      />
      <template #footer="{ close }">
        <BaseButton variant="secondary" block @click="close">{{ $t('common.action.close') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
