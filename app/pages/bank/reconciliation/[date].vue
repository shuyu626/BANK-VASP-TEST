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

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('common.label.submitTime') }}</th>
            <th>{{ $t('common.label.direction') }}</th>
            <th>{{ $t('common.label.user') }}</th>
            <th class="text-right">{{ $t('common.label.amount') }}</th>
            <th>{{ $t('common.label.status') }}</th>
            <th>{{ $t('bank.trustAccounts.detail.thRef') }}</th>
            <th>{{ $t('bank.reconciliation.detail.thFinish') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="data.rows.length === 0">
            <td colspan="7" class="text-center text-text-muted py-10">{{ $t('bank.reconciliation.detail.empty') }}</td>
          </tr>
          <tr v-for="r in data.rows" :key="`${r.kind}-${r.id}`">
            <td class="num text-text-muted text-xs">{{ fmtDt(r.submittedAt) }}</td>
            <td>
              <span :class="r.kind === 'deposit' ? 'text-success' : 'text-text-muted'">
                {{ r.kind === 'deposit' ? $t('bank.reconciliation.detail.kindIn') : $t('bank.reconciliation.detail.kindOut') }}
              </span>
            </td>
            <td>
              <div class="font-medium">{{ r.userName }}</div>
              <div class="text-xs text-text-muted font-mono">{{ r.userId }}</div>
            </td>
            <td class="text-right num font-medium">{{ fmtTwd(r.amount) }}</td>
            <td>
              <BaseBadge :variant="fiatTxnVariant(r.status)">{{ r.status }}</BaseBadge>
            </td>
            <td class="font-mono text-xs text-text-muted">{{ r.bankReference ?? '—' }}</td>
            <td class="num text-text-muted text-xs">{{ fmtDt(r.completedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
