<script setup lang="ts">
import type { SarReport } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.sar') }))

interface Item {
  report: SarReport
  user: { id: string; displayName: string } | null
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/sar')
const toast = useToast()
const sarItems = computed(() => data.value?.items ?? [])
const expandedReportIds = ref<string[]>([])

const sarColumns = computed(() => [
  { key: 'expander', label: '', headerClass: 'w-8 text-center', cellClass: 'text-center text-text-muted' },
  { key: 'createdAt', label: t('bank.sar.th.createdAt') },
  { key: 'user', label: t('common.label.user') },
  { key: 'narrativeShort', label: t('bank.sar.th.narrativeShort') },
  { key: 'alertRef', label: t('bank.sar.th.alertRef') },
  { key: 'status', label: t('common.label.status') },
  { key: 'submittedAt', label: t('bank.sar.th.submitTime') },
  { key: 'action', label: t('common.label.action'), align: 'right' as const }
])

async function onMark(id: string, status: 'submitted' | 'accepted') {
  try {
    await $fetch(`/api/bank/sar/${id}/mark`, {
      method: 'POST',
      body: { status }
    })
    toast.success(status === 'accepted' ? t('bank.sar.acceptSuccess') : t('bank.sar.submitSuccess'))
    await refresh()
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('bank.sar.operationFailed'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.sar.title')" :subtitle="$t('bank.sar.subtitle')" />

    <BaseTable
      :columns="sarColumns"
      :items="sarItems"
      :row-key="(row) => row.report.id"
      :expanded-keys="expandedReportIds"
      expand-on-row-click
      :expanded-colspan="8"
      :error-message="errorMessage"
      :empty-text="$t('bank.sar.empty')"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @update:expanded-keys="(keys) => { expandedReportIds = keys as string[] }"
      @retry="refresh()"
    >
      <template #cell-expander="{ row }">
        {{ expandedReportIds.includes(row.report.id) ? '▼' : '▶' }}
      </template>
      <template #cell-createdAt="{ row }">
        <span class="num text-xs whitespace-nowrap">{{ fmtDt(row.report.createdAt) }}</span>
      </template>
      <template #cell-user="{ row }">
        <div>
          <div class="font-medium">{{ row.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted font-mono">{{ row.report.userId }}</div>
        </div>
      </template>
      <template #cell-narrativeShort="{ row }">
        <span class="text-xs max-w-md">{{ row.report.narrative.slice(0, 60) }}{{ row.report.narrative.length > 60 ? '…' : '' }}</span>
      </template>
      <template #cell-alertRef="{ row }">
        <span class="font-mono text-xs">{{ row.report.alertId }}</span>
      </template>
      <template #cell-status="{ row }">
        <BaseBadge :variant="reportStatusVariant(row.report.status)">{{ row.report.status }}</BaseBadge>
      </template>
      <template #cell-submittedAt="{ row }">
        <span class="num text-text-muted text-xs">{{ fmtDt(row.report.submittedAt) }}</span>
      </template>
      <template #cell-action="{ row }">
        <div class="text-right" @click.stop>
          <BaseButton
            v-if="row.report.status === 'draft' || row.report.status === 'under_review'"
            variant="secondary"
            size="sm"
            class="!border-primary-900 !text-primary-900"
            @click="onMark(row.report.id, 'submitted')"
          >
            {{ $t('bank.sar.submitCta') }}
          </BaseButton>
          <BaseButton
            v-else-if="row.report.status === 'submitted'"
            variant="secondary"
            size="sm"
            class="!border-success !text-success"
            @click="onMark(row.report.id, 'accepted')"
          >
            {{ $t('bank.sar.markAccept') }}
          </BaseButton>
          <span v-else class="text-xs text-text-muted">—</span>
        </div>
      </template>
      <template #row-expanded="{ row }">
        <div class="-mx-4 -my-3 px-8 py-3 bg-neutral-50 text-xs space-y-3">
          <div>
            <div class="font-semibold mb-1">{{ $t('bank.sar.fullNarrative') }}</div>
            <div class="whitespace-pre-wrap leading-relaxed">{{ row.report.narrative }}</div>
            <div class="text-text-muted mt-3">{{ t('bank.sar.createdBy', { by: row.report.createdBy }) }}</div>
          </div>
          <div class="flex gap-2 items-center pt-2 border-t border-border">
            <span class="text-text-muted">{{ $t('bank.sar.exportTitle') }}</span>
            <a
              :href="`/api/bank/sar/${row.report.id}/export?format=json`"
              class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
              download
            >{{ $t('bank.common.exportJson') }}</a>
            <a
              :href="`/api/bank/sar/${row.report.id}/export?format=xml`"
              class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
              download
            >{{ $t('bank.common.exportXml') }}</a>
          </div>
        </div>
      </template>
    </BaseTable>
  </div>
</template>
