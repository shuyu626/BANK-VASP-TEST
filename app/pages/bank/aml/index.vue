<script setup lang="ts">
import type { AmlAlert, RiskLevel } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.aml') }))

interface Item {
  alert: AmlAlert
  user: { id: string; displayName: string; riskLevel: string; isFrozen: boolean } | null
}

type Status = 'open' | 'resolved' | 'all'
const statusFilter = ref<Status>('open')
const severity = ref<RiskLevel | ''>('')

const tabOptions = computed<{ value: Status; label: string }[]>(() => [
  { value: 'open', label: t('bank.aml.tab.open') },
  { value: 'resolved', label: t('bank.aml.tab.resolved') },
  { value: 'all', label: t('bank.aml.tab.all') }
])

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/aml', {
  query: computed(() => ({
    status: statusFilter.value,
    severity: severity.value || undefined
  }))
})
watch([statusFilter, severity], () => refresh())

const amlItems = computed(() => data.value?.items ?? [])

const amlColumns = computed(() => [
  { key: 'createdAt', label: t('common.label.time') },
  { key: 'severity', label: t('common.label.severity') },
  { key: 'type', label: t('bank.aml.thType') },
  { key: 'user', label: t('common.label.user') },
  { key: 'amount', label: t('common.label.amount'), align: 'right' as const },
  { key: 'description', label: t('common.label.description') },
  { key: 'status', label: t('common.label.status') },
  { key: 'action', label: '', align: 'right' as const }
])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.aml.title')" :subtitle="$t('bank.aml.subtitle')" />

    <div class="flex items-center gap-3">
      <BaseTabBar v-model="statusFilter" :options="tabOptions" />
      <div class="w-44">
        <BaseSelect
          v-model="severity"
          :options="[
            { value: '', label: $t('bank.aml.filterSeverity') },
            { value: 'low', label: $t('riskLevel.low') },
            { value: 'medium', label: $t('riskLevel.medium') },
            { value: 'high', label: $t('riskLevel.high') },
            { value: 'critical', label: $t('riskLevel.critical') }
          ]"
        />
      </div>
    </div>

    <BaseTable
      :columns="amlColumns"
      :items="amlItems"
      :row-key="(row) => row.alert.id"
      paginated
      :default-page-size="10"
      :empty-text="$t('bank.aml.empty')"
      :error-message="errorMessage"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @retry="refresh()"
    >
      <template #cell-createdAt="{ row }">
        <span class="num text-text-muted text-xs whitespace-nowrap">{{ fmtDt(row.alert.createdAt) }}</span>
      </template>
      <template #cell-severity="{ row }">
        <BaseBadge :variant="riskVariant(row.alert.severity)">{{ row.alert.severity }}</BaseBadge>
      </template>
      <template #cell-type="{ row }">
        <span class="text-xs">{{ row.alert.type }}</span>
      </template>
      <template #cell-user="{ row }">
        <div>
          <div class="font-medium">{{ row.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted font-mono">{{ row.alert.userId }}</div>
        </div>
      </template>
      <template #cell-amount="{ row }">{{ fmtTwd(row.alert.amount) }}</template>
      <template #cell-description="{ row }">
        <span class="text-xs max-w-xs">{{ row.alert.description }}</span>
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.alert.resolvedAt" class="text-xs text-success">{{ row.alert.resolution }}</span>
        <span v-else class="text-xs text-warning font-semibold">{{ $t('bank.aml.open') }}</span>
      </template>
      <template #cell-action="{ row }">
        <NuxtLink :to="`/bank/aml/${row.alert.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
      </template>
    </BaseTable>
  </div>
</template>
