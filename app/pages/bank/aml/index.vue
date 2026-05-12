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

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('common.label.time') }}</th>
            <th>{{ $t('common.label.severity') }}</th>
            <th>{{ $t('bank.aml.thType') }}</th>
            <th>{{ $t('common.label.user') }}</th>
            <th class="text-right">{{ $t('common.label.amount') }}</th>
            <th>{{ $t('common.label.description') }}</th>
            <th>{{ $t('common.label.status') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="8" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="!data || data.items.length === 0">
            <td colspan="8" class="text-center text-text-muted py-10">{{ $t('bank.aml.empty') }}</td>
          </tr>
          <tr v-for="it in data?.items ?? []" :key="it.alert.id">
            <td class="num text-text-muted text-xs whitespace-nowrap">{{ fmtDt(it.alert.createdAt) }}</td>
            <td>
              <BaseBadge :variant="riskVariant(it.alert.severity)">{{ it.alert.severity }}</BaseBadge>
            </td>
            <td class="text-xs">{{ it.alert.type }}</td>
            <td>
              <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
              <div class="text-xs text-text-muted font-mono">{{ it.alert.userId }}</div>
            </td>
            <td class="text-right num">{{ fmtTwd(it.alert.amount) }}</td>
            <td class="text-xs max-w-xs">{{ it.alert.description }}</td>
            <td class="text-xs">
              <span v-if="it.alert.resolvedAt" class="text-success">{{ it.alert.resolution }}</span>
              <span v-else class="text-warning font-semibold">{{ $t('bank.aml.open') }}</span>
            </td>
            <td class="text-right">
              <NuxtLink :to="`/bank/aml/${it.alert.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
