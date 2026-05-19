<script setup lang="ts">
definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.reconciliation') }))

interface Item {
  date: string
  depositCount: number
  depositAmount: number
  withdrawCount: number
  withdrawAmount: number
  pendingCount: number
  failedCount: number
  netFlow: number
  hasDiff: boolean
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/reconciliation')

const reconciliationItems = computed(() => data.value?.items ?? [])

const reconciliationColumns = computed(() => [
  { key: 'date', label: t('bank.reconciliation.th.date') },
  { key: 'depositCount', label: t('bank.reconciliation.th.depositCount'), align: 'right' as const },
  { key: 'depositAmount', label: t('bank.reconciliation.th.depositAmount'), align: 'right' as const },
  { key: 'withdrawCount', label: t('bank.reconciliation.th.withdrawCount'), align: 'right' as const },
  { key: 'withdrawAmount', label: t('bank.reconciliation.th.withdrawAmount'), align: 'right' as const },
  { key: 'netFlow', label: t('bank.reconciliation.th.netFlow'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') },
  { key: 'action', label: '', align: 'right' as const }
])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.reconciliation.title')" :subtitle="$t('bank.reconciliation.subtitle')" />

    <BaseTable
      :columns="reconciliationColumns"
      :items="reconciliationItems"
      row-key="date"
      numeric
      :empty-text="$t('bank.reconciliation.empty')"
      :error-message="errorMessage"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @retry="refresh()"
    >
      <template #cell-depositCount="{ row }">
        <span class="text-text-muted">{{ row.depositCount }}</span>
      </template>
      <template #cell-depositAmount="{ row }">{{ fmtTwd(row.depositAmount) }}</template>
      <template #cell-withdrawCount="{ row }">
        <span class="text-text-muted">{{ row.withdrawCount }}</span>
      </template>
      <template #cell-withdrawAmount="{ row }">{{ fmtTwd(row.withdrawAmount) }}</template>
      <template #cell-netFlow="{ row }">
        <span class="font-medium" :class="row.netFlow >= 0 ? 'text-success' : 'text-text-muted'">
          {{ row.netFlow >= 0 ? '+' : '' }}{{ fmtTwd(row.netFlow) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <BaseBadge v-if="row.hasDiff" variant="warning">{{ $t('bank.reconciliation.needsFollow') }}</BaseBadge>
        <BaseBadge v-else variant="success">{{ $t('bank.reconciliation.settled') }}</BaseBadge>
        <span v-if="row.pendingCount > 0" class="ml-2 text-xs text-text-muted">{{ t('bank.reconciliation.pendingPrefix', { count: row.pendingCount }) }}</span>
        <span v-if="row.failedCount > 0" class="ml-1 text-xs text-danger">{{ t('bank.reconciliation.failedPrefix', { count: row.failedCount }) }}</span>
      </template>
      <template #cell-action="{ row }">
        <NuxtLink :to="`/bank/reconciliation/${row.date}`" class="text-xs hover:underline">{{ $t('bank.reconciliation.viewDetail') }}</NuxtLink>
      </template>
    </BaseTable>
  </div>
</template>
