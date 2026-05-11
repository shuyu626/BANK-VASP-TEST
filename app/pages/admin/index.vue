<script setup lang="ts">
import type { AuditLog } from '~~/shared/types'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.dashboard') }))

interface DashboardData {
  today: { tradingVolumeTwd: number; newUsers: number; fiatInboundTwd: number; fiatOutboundTwd: number }
  counts: { totalUsers: number; pendingKyc: number; openAmlAlerts: number; frozen: number }
  recentActivity: AuditLog[]
}

const { data, refresh } = await useFetch<DashboardData>('/api/admin/dashboard', {
  headers: ssrCookieHeaders()
})

const roleColour: Record<string, string> = {
  user: 'bg-neutral-500/20 text-neutral-600',
  system: 'bg-info/20 text-info',
  compliance: 'bg-primary-700 text-white',
  ops: 'bg-primary-500 text-white',
  risk: 'bg-warning text-white',
  bank: 'bg-gold-500 text-white'
}
</script>

<template>
  <div v-if="data" class="space-y-8">
    <BasePageHeader
      :title="$t('admin.dashboard.title')"
      :subtitle="t('admin.dashboard.subtitle', { date: new Date().toISOString().slice(0, 10) })"
    >
      <template #actions>
        <BaseButton variant="secondary" size="sm" @click="refresh()">
          {{ $t('common.action.refresh') }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BaseKpi :label="$t('admin.dashboard.kpiVolume')" :value="fmtTwd(data.today.tradingVolumeTwd)" />
      <BaseKpi :label="$t('admin.dashboard.kpiNewUsers')" :value="data.today.newUsers" />
      <BaseKpi :label="$t('admin.dashboard.kpiInbound')" :value="fmtTwd(data.today.fiatInboundTwd)" />
      <BaseKpi :label="$t('admin.dashboard.kpiOutbound')" :value="fmtTwd(data.today.fiatOutboundTwd)" />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <BaseKpi :label="$t('admin.dashboard.kpiTotalUsers')" :value="data.counts.totalUsers" />
      <BaseKpi
        :label="$t('admin.dashboard.kpiPendingKyc')"
        :value="data.counts.pendingKyc"
        :tone="data.counts.pendingKyc > 0 ? 'warning' : 'default'"
      >
        <span class="num">{{ data.counts.pendingKyc }}</span>
        <NuxtLink v-if="data.counts.pendingKyc > 0" to="/admin/kyc" class="text-xs text-primary-700 ml-2 font-normal">{{ $t('admin.dashboard.process') }}</NuxtLink>
      </BaseKpi>
      <BaseKpi
        :label="$t('admin.dashboard.kpiOpenAml')"
        :value="data.counts.openAmlAlerts"
        :tone="data.counts.openAmlAlerts > 0 ? 'danger' : 'default'"
      />
      <BaseKpi :label="$t('admin.dashboard.kpiFrozen')" :value="data.counts.frozen" />
    </div>

    <section>
      <h2 class="text-base font-semibold mb-3 text-neutral-900">{{ $t('admin.dashboard.recentActivity') }}</h2>
      <BaseTable :colspan="5" :empty="data.recentActivity.length === 0" :empty-text="$t('admin.dashboard.noActivity')">
        <template #head>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('admin.role.compliance') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.actor') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.resource') }}</th>
          </tr>
        </template>
        <tr v-for="a in data.recentActivity" :key="a.id" class="border-b border-border last:border-0">
          <td class="px-4 py-3 num text-text-muted whitespace-nowrap">{{ fmtDt(a.timestamp, 'short') }}</td>
          <td class="px-4 py-3">
            <span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm" :class="roleColour[a.actorRole] ?? 'bg-neutral-300'">
              {{ a.actorRole }}
            </span>
          </td>
          <td class="px-4 py-3 font-mono text-xs">{{ a.actor }}</td>
          <td class="px-4 py-3">{{ a.action }}</td>
          <td class="px-4 py-3 text-xs text-text-muted">{{ a.resourceType }}:{{ a.resourceId }}</td>
        </tr>
      </BaseTable>
    </section>
  </div>
</template>
