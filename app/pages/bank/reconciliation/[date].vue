<script setup lang="ts">
definePageMeta({ layout: 'bank' })

interface Row {
  kind: 'deposit' | 'withdrawal'
  id: string
  userId: string
  userName: string
  amount: number
  status: string
  submittedAt: string
  completedAt: string | null
  bankReference: string | null
}

interface Detail {
  summary: {
    date: string
    totalRows: number
    depositCount: number
    depositAmount: number
    withdrawCount: number
    withdrawAmount: number
    pendingRows: number
    failedRows: number
  }
  rows: Row[]
}

const route = useRoute()
const date = computed(() => String(route.params.date))
const { t } = useI18n()

const { data, errorMessage, refresh } = await useBankResource<Detail>(() => `/api/bank/reconciliation/${date.value}`)
useHead(() => ({ title: t('bank.head.reconciliationDate', { date: date.value }) }))

const reconciliationColumns = computed(() => [
  { key: 'submittedAt', label: t('common.label.submitTime') },
  { key: 'kind', label: t('common.label.direction') },
  { key: 'userName', label: t('common.label.user') },
  { key: 'amount', label: t('common.label.amount'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') },
  { key: 'bankReference', label: t('bank.trustAccounts.detail.thRef') },
  { key: 'completedAt', label: t('bank.reconciliation.detail.thFinish') }
])
</script>

<template>
  <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
  <div v-else-if="data" class="space-y-6">
    <NuxtLink to="/bank/reconciliation" class="text-xs text-text-muted hover:text-text">{{ $t('bank.reconciliation.detail.back') }}</NuxtLink>
    <BasePageHeader
      :title="t('bank.reconciliation.detail.title', { date: data.summary.date })"
      :subtitle="t('bank.reconciliation.detail.subtitle', { count: data.summary.totalRows })"
    />

    <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BaseKpi theme="bank" size="sm"
        :label="$t('bank.reconciliation.detail.kpiDeposit')"
        :value="fmtTwd(data.summary.depositAmount)"
        :hint="t('bank.reconciliation.detail.kpiCount', { count: data.summary.depositCount })"
      />
      <BaseKpi theme="bank" size="sm"
        :label="$t('bank.reconciliation.detail.kpiWithdraw')"
        :value="fmtTwd(data.summary.withdrawAmount)"
        :hint="t('bank.reconciliation.detail.kpiCount', { count: data.summary.withdrawCount })"
      />
      <BaseKpi theme="bank" size="sm"
        :tone="data.summary.pendingRows > 0 ? 'warning' : 'default'"
        :label="$t('bank.reconciliation.detail.kpiPending')"
        :value="data.summary.pendingRows"
      />
      <BaseKpi theme="bank" size="sm"
        :tone="data.summary.failedRows > 0 ? 'danger' : 'default'"
        :label="$t('bank.reconciliation.detail.kpiFailed')"
        :value="data.summary.failedRows"
      />
    </section>

    <BaseTable
      :columns="reconciliationColumns"
      :items="data.rows"
      :row-key="(row) => `${row.kind}-${row.id}`"
      numeric
      :empty-text="$t('bank.reconciliation.detail.empty')"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
    >
      <template #cell-submittedAt="{ row }">
        <span class="text-text-muted text-xs">{{ fmtDt(row.submittedAt) }}</span>
      </template>
      <template #cell-kind="{ row }">
        <span :class="row.kind === 'deposit' ? 'text-success' : 'text-text-muted'">
          {{ row.kind === 'deposit' ? $t('bank.reconciliation.detail.kindIn') : $t('bank.reconciliation.detail.kindOut') }}
        </span>
      </template>
      <template #cell-userName="{ row }">
        <div>
          <div class="font-medium">{{ row.userName }}</div>
          <div class="text-xs text-text-muted font-mono">{{ row.userId }}</div>
        </div>
      </template>
      <template #cell-amount="{ row }">
        <span class="font-medium">{{ fmtTwd(row.amount) }}</span>
      </template>
      <template #cell-status="{ row }">
        <BaseBadge :variant="fiatTxnVariant(row.status)">{{ row.status }}</BaseBadge>
      </template>
      <template #cell-bankReference="{ row }">
        <span class="font-mono text-xs text-text-muted">{{ row.bankReference ?? '—' }}</span>
      </template>
      <template #cell-completedAt="{ row }">
        <span class="text-text-muted text-xs">{{ fmtDt(row.completedAt) }}</span>
      </template>
    </BaseTable>
  </div>
</template>
