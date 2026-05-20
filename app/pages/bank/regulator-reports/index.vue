<script setup lang="ts">
definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.regulatorReports') }))

interface RecentItem {
  kind: 'ctr' | 'sar'
  id: string
  status: string
  submittedAt: string | null
  userId: string
  summary: string
}

interface Data {
  ctrStats: { draft: number; submitted: number; accepted: number }
  sarStats: { draft: number; underReview: number; submitted: number; accepted: number }
  openAmlAlerts: number
  recent: RecentItem[]
}

const { data, errorMessage, refresh } = await useBankResource<Data>('/api/bank/regulator-reports')

const recentReportColumns = computed(() => [
  { key: 'kind', label: t('bank.regulator.thKind') },
  { key: 'submittedAt', label: t('bank.regulator.thSubmitTime') },
  { key: 'status', label: t('common.label.status') },
  { key: 'userId', label: t('common.label.user') },
  { key: 'summary', label: t('bank.regulator.thSummary') },
  { key: 'detail', label: '', align: 'right' as const }
])
</script>

<template>
  <div v-if="errorMessage" class="space-y-4">
    <BasePageHeader :title="$t('bank.regulator.title')" :subtitle="$t('bank.regulator.subtitle')" />
    <div class="bank-panel p-8 flex flex-col items-center gap-3 text-text-muted">
      <Icon name="lucide:alert-triangle" size="24" class="text-danger" aria-hidden="true" />
      <div class="text-sm font-medium text-text">{{ $t('components.tableShell.errorTitle') }}</div>
      <div class="text-xs">{{ errorMessage }}</div>
      <button
        type="button"
        class="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-surface-alt"
        @click="refresh()"
      >
        <Icon name="lucide:refresh-cw" size="12" aria-hidden="true" />
        {{ $t('components.tableShell.errorRetry') }}
      </button>
    </div>
  </div>
  <div v-else-if="data" class="space-y-8">
    <BasePageHeader :title="$t('bank.regulator.title')" :subtitle="$t('bank.regulator.subtitle')" />

    <section>
      <h2 class="bank-heading text-lg mb-3">{{ $t('bank.regulator.ctrTitle') }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseKpi theme="bank" size="sm" :tone="data.ctrStats.draft > 0 ? 'warning' : 'default'" :label="$t('bank.regulator.draftLabel')" :value="data.ctrStats.draft" />
        <BaseKpi theme="bank" size="sm" :label="$t('bank.regulator.submittedLabel')" :value="data.ctrStats.submitted" />
        <BaseKpi theme="bank" size="sm" :label="$t('bank.regulator.acceptedLabel')" :value="data.ctrStats.accepted" />
      </div>
      <NuxtLink to="/bank/ctr" class="inline-block text-xs text-text-muted hover:text-text mt-2">{{ $t('bank.regulator.ctrLink') }}</NuxtLink>
    </section>

    <section>
      <h2 class="bank-heading text-lg mb-3">{{ $t('bank.regulator.sarTitle') }}</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <BaseKpi theme="bank" size="sm" :tone="data.sarStats.draft > 0 ? 'warning' : 'default'" :label="$t('bank.regulator.draftLabelShort')" :value="data.sarStats.draft" />
        <BaseKpi theme="bank" size="sm" :label="$t('bank.regulator.underReview')" :value="data.sarStats.underReview" />
        <BaseKpi theme="bank" size="sm" :label="$t('bank.regulator.submittedLabel')" :value="data.sarStats.submitted" />
        <BaseKpi theme="bank" size="sm" :label="$t('bank.regulator.acceptedLabel')" :value="data.sarStats.accepted" />
      </div>
      <NuxtLink to="/bank/sar" class="inline-block text-xs text-text-muted hover:text-text mt-2">{{ $t('bank.regulator.sarLink') }}</NuxtLink>
    </section>

    <section>
      <h2 class="bank-heading text-lg mb-3 flex items-center gap-3">
        {{ $t('bank.regulator.recentTitle') }}
        <span v-if="data.openAmlAlerts > 0" class="bank-stamp bank-gold-accent">{{ t('bank.regulator.amlPendingBadge', { count: data.openAmlAlerts }) }}</span>
      </h2>
      <BaseTable
        :columns="recentReportColumns"
        :items="data.recent"
        :row-key="(row) => `${row.kind}-${row.id}`"
        paginated
        :default-page-size="10"
        numeric
        :empty-text="$t('bank.regulator.empty')"
        panel-class="bank-panel"
        table-class="bank-table"
        table-min-width="720px"
      >
        <template #cell-kind="{ row }">
          <span class="text-xs uppercase tracking-wider font-semibold">{{ row.kind }}</span>
        </template>
        <template #cell-submittedAt="{ row }">
          <span class="text-text-muted text-xs">{{ fmtDt(row.submittedAt) }}</span>
        </template>
        <template #cell-status="{ row }">
          <BaseBadge :variant="reportStatusVariant(row.status)">{{ row.status }}</BaseBadge>
        </template>
        <template #cell-userId="{ row }">
          <span class="font-mono text-xs">{{ row.userId }}</span>
        </template>
        <template #cell-summary="{ row }">
          <span class="text-xs">{{ row.summary }}</span>
        </template>
        <template #cell-detail="{ row }">
          <NuxtLink :to="row.kind === 'ctr' ? '/bank/ctr' : '/bank/sar'" class="text-xs hover:underline">
            {{ $t('bank.regulator.viewDetail') }}
          </NuxtLink>
        </template>
      </BaseTable>
    </section>
  </div>
</template>
