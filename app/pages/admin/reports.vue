<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.reports') }))

const reviews = useAdminReviewsStore()
const { ctrs, sars, loading, error } = storeToRefs(reviews)
await reviews.loadReports()

type Tab = 'ctr' | 'sar'
const tab = ref<Tab>('ctr')
const expanded = ref<Set<string>>(new Set())
const toast = useToast()

const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'ctr', label: t('admin.reports.tabCtr') },
  { value: 'sar', label: t('admin.reports.tabSar') }
])

async function markSubmitted(type: Tab, id: string) {
  try {
    await reviews.markReport(type, id, 'submitted')
    await reviews.loadReports()
    toast.success(t('admin.reports.markSuccess'))
  } catch {
    toast.error(t('admin.reports.operationFailed'))
  }
}

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

function truncate(s: string, len: number) {
  return s.length > len ? s.slice(0, len) + '…' : s
}
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader
      :title="$t('admin.reports.title')"
      :subtitle="$t('admin.reports.subtitle')"
    />

    <BaseTabBar v-model="tab" :options="tabOptions" />

    <!-- CTR -->
    <BaseTable
      v-if="tab === 'ctr'"
      :colspan="6"
      :empty="ctrs.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.reports.ctrEmpty')"
      :skeleton-rows="5"
      numeric
      @retry="reviews.loadReports()"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('admin.reports.thReportDate') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('admin.reports.thTotalAmount') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('admin.reports.thCount') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
        </tr>
      </template>
      <tr v-for="it in ctrs" :key="it.report.id" class="border-b border-border last:border-0">
        <td class="px-4 py-3">{{ it.report.reportDate }}</td>
        <td class="px-4 py-3">
          <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted font-mono">{{ it.report.userId }}</div>
        </td>
        <td class="px-4 py-3 text-right">{{ fmtTwd(it.report.totalAmount) }}</td>
        <td class="px-4 py-3 text-right text-text-muted">{{ it.report.txIds.length }}</td>
        <td class="px-4 py-3">
          <BaseBadge :variant="reportStatusVariant(it.report.status)">
            {{ it.report.status }}
          </BaseBadge>
        </td>
        <td class="px-4 py-3 text-right">
          <BaseButton
            v-if="it.report.status === 'draft'"
            variant="secondary"
            size="sm"
            class="!border-primary-700 !text-primary-700"
            @click="markSubmitted('ctr', it.report.id)"
          >
            {{ $t('admin.reports.markSubmitted') }}
          </BaseButton>
          <span v-else class="text-xs text-text-muted">{{ fmtDt(it.report.submittedAt) }}</span>
        </td>
      </tr>
    </BaseTable>

    <!-- SAR -->
    <BaseTable
      v-else
      :colspan="6"
      :empty="sars.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.reports.sarEmpty')"
      :skeleton-rows="5"
      @retry="reviews.loadReports()"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="w-8" />
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.createdAt') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('admin.reports.thNarrative') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
        </tr>
      </template>
      <template v-for="it in sars" :key="it.report.id">
        <tr class="border-b border-border hover:bg-surface-alt">
          <td class="px-3 py-2 text-center cursor-pointer text-text-muted" @click="toggle(it.report.id)">
            {{ expanded.has(it.report.id) ? '▼' : '▶' }}
          </td>
          <td class="px-4 py-3 num text-text-muted whitespace-nowrap text-xs">{{ fmtDt(it.report.createdAt) }}</td>
          <td class="px-4 py-3">
            <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
            <div class="text-xs text-text-muted font-mono">{{ it.report.userId }}</div>
          </td>
          <td class="px-4 py-3 text-xs">{{ truncate(it.report.narrative, 50) }}</td>
          <td class="px-4 py-3">
            <BaseBadge :variant="reportStatusVariant(it.report.status)">
              {{ it.report.status }}
            </BaseBadge>
          </td>
          <td class="px-4 py-3 text-right">
            <BaseButton
              v-if="it.report.status === 'draft' || it.report.status === 'under_review'"
              variant="secondary"
              size="sm"
              class="!border-primary-700 !text-primary-700"
              @click="markSubmitted('sar', it.report.id)"
            >
              {{ $t('admin.reports.markSubmitted') }}
            </BaseButton>
            <span v-else class="text-xs text-text-muted">{{ fmtDt(it.report.submittedAt) }}</span>
          </td>
        </tr>
        <tr v-if="expanded.has(it.report.id)" class="border-b border-border">
          <td colspan="6" class="px-8 py-3 bg-neutral-50 text-xs">
            <div class="font-semibold mb-1">{{ $t('admin.reports.fullNarrative') }}</div>
            <div class="whitespace-pre-wrap">{{ it.report.narrative }}</div>
            <div class="text-text-muted mt-2">{{ $t('admin.reports.alertId') }} <span class="font-mono">{{ it.report.alertId }}</span> · {{ $t('admin.reports.createdBy') }} <span class="font-mono">{{ it.report.createdBy }}</span></div>
          </td>
        </tr>
      </template>
    </BaseTable>
  </div>
</template>
