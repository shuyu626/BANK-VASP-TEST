<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'
import type { RiskLevel, AmlAlertType } from '~~/shared/types'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.risk') }))

const reviews = useAdminReviewsStore()
const { alerts, loading, error } = storeToRefs(reviews)

const statusTab = ref<'open' | 'resolved' | 'all'>('open')
const severity = ref<RiskLevel | ''>('')
const type = ref<AmlAlertType | ''>('')

async function load() {
  await reviews.loadAlerts({
    status: statusTab.value,
    severity: severity.value || undefined,
    type: type.value || undefined
  })
}
await load()
watch([statusTab, severity, type], load)

const statusTabs = computed<{ value: 'open' | 'resolved' | 'all'; label: string }[]>(() => [
  { value: 'open', label: t('admin.risk.tab.open') },
  { value: 'resolved', label: t('admin.risk.tab.resolved') },
  { value: 'all', label: t('admin.risk.tab.all') }
])
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader
      :title="$t('admin.risk.title')"
      :subtitle="$t('admin.risk.subtitle')"
    />

    <div class="flex gap-2 items-center">
      <BaseTabBar v-model="statusTab" :options="statusTabs" />
      <div class="w-44 ml-4">
        <BaseSelect
          v-model="severity"
          :options="[
            { value: '', label: $t('admin.risk.filterSeverity') },
            { value: 'low', label: $t('riskLevel.low') },
            { value: 'medium', label: $t('riskLevel.medium') },
            { value: 'high', label: $t('riskLevel.high') },
            { value: 'critical', label: $t('riskLevel.critical') }
          ]"
        />
      </div>
      <div class="w-48">
        <BaseSelect
          v-model="type"
          :options="[
            { value: '', label: $t('admin.risk.filterType') },
            { value: 'blacklist_hit', label: $t('amlType.blacklist_hit') },
            { value: 'large_amount', label: $t('amlType.large_amount') },
            { value: 'structuring', label: $t('amlType.structuring') },
            { value: 'rapid_turnover', label: $t('amlType.rapid_turnover') },
            { value: 'high_risk_region', label: $t('amlType.high_risk_region') },
            { value: 'velocity', label: $t('amlType.velocity') }
          ]"
        />
      </div>
    </div>

    <BaseTable
      :colspan="8"
      :empty="alerts.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.risk.empty')"
      :skeleton-rows="6"
      @retry="load()"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.severity') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.type') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.amount') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.description') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-right px-4 py-3 font-medium" />
        </tr>
      </template>
      <tr v-for="it in alerts" :key="it.alert.id" class="border-b border-border last:border-0 hover:bg-surface-alt">
        <td class="px-4 py-3 num text-text-muted whitespace-nowrap">{{ fmtDt(it.alert.createdAt) }}</td>
        <td class="px-4 py-3">
          <BaseBadge :variant="riskVariant(it.alert.severity)">{{ it.alert.severity }}</BaseBadge>
        </td>
        <td class="px-4 py-3 text-xs">{{ it.alert.type }}</td>
        <td class="px-4 py-3">
          <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted font-mono">{{ it.alert.userId }}</div>
        </td>
        <td class="px-4 py-3 text-right num">{{ fmtTwd(it.alert.amount) }}</td>
        <td class="px-4 py-3 text-xs max-w-xs">{{ it.alert.description }}</td>
        <td class="px-4 py-3 text-xs">
          <span v-if="it.alert.resolvedAt" class="text-success">{{ it.alert.resolution }}</span>
          <span v-else class="text-warning font-semibold">{{ $t('admin.risk.open') }}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/admin/risk/${it.alert.id}`" class="text-xs text-primary-700 hover:underline">
            {{ $t('common.action.viewDetail') }}
          </NuxtLink>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>
