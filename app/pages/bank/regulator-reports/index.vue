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
      <div class="bank-panel overflow-x-auto">
        <table class="bank-table">
          <thead>
            <tr>
              <th>{{ $t('bank.regulator.thKind') }}</th>
              <th>{{ $t('bank.regulator.thSubmitTime') }}</th>
              <th>{{ $t('common.label.status') }}</th>
              <th>{{ $t('common.label.user') }}</th>
              <th>{{ $t('bank.regulator.thSummary') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="data.recent.length === 0">
              <td colspan="6" class="text-center text-text-muted py-10">{{ $t('bank.regulator.empty') }}</td>
            </tr>
            <tr v-for="r in data.recent" :key="`${r.kind}-${r.id}`">
              <td>
                <span class="text-xs uppercase tracking-wider font-semibold">{{ r.kind }}</span>
              </td>
              <td class="num text-text-muted text-xs">{{ fmtDt(r.submittedAt) }}</td>
              <td>
                <BaseBadge :variant="reportStatusVariant(r.status)">{{ r.status }}</BaseBadge>
              </td>
              <td class="font-mono text-xs">{{ r.userId }}</td>
              <td class="text-xs">{{ r.summary }}</td>
              <td class="text-right">
                <NuxtLink :to="r.kind === 'ctr' ? '/bank/ctr' : '/bank/sar'" class="text-xs hover:underline">
                  {{ $t('bank.regulator.viewDetail') }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
