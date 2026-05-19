<script setup lang="ts">
import type { CtrReport } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.ctr') }))

interface Item {
  report: CtrReport
  user: { id: string; displayName: string } | null
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/ctr')
const toast = useToast()
const ctrItems = computed(() => data.value?.items ?? [])
const expandedReportIds = ref<string[]>([])

const ctrColumns = computed(() => [
  { key: 'expander', label: '', headerClass: 'w-8 text-center', cellClass: 'text-center text-text-muted' },
  { key: 'reportDate', label: t('bank.ctr.th.reportDate') },
  { key: 'user', label: t('common.label.user') },
  { key: 'totalAmount', label: t('bank.ctr.th.totalAmount'), align: 'right' as const },
  { key: 'txCount', label: t('bank.ctr.th.txCount'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') },
  { key: 'submittedAt', label: t('bank.ctr.th.submitTime') },
  { key: 'action', label: t('common.label.action'), align: 'right' as const }
])

async function onMark(id: string, status: 'submitted' | 'accepted') {
  try {
    await $fetch(`/api/bank/ctr/${id}/mark`, {
      method: 'POST',
      body: { status }
    })
    toast.success(status === 'accepted' ? t('bank.ctr.acceptSuccess') : t('bank.ctr.submitSuccess'))
    await refresh()
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('bank.ctr.operationFailed'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.ctr.title')" :subtitle="$t('bank.ctr.subtitle')" />

    <BaseTable
      :columns="ctrColumns"
      :items="ctrItems"
      :row-key="(row) => row.report.id"
      :expanded-keys="expandedReportIds"
      expand-on-row-click
      :expanded-colspan="8"
      numeric
      :error-message="errorMessage"
      :empty-text="$t('bank.ctr.empty')"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @update:expanded-keys="(keys) => { expandedReportIds = keys as string[] }"
      @retry="refresh()"
    >
      <template #cell-expander="{ row }">
        {{ expandedReportIds.includes(row.report.id) ? '▼' : '▶' }}
      </template>
      <template #cell-reportDate="{ row }">{{ row.report.reportDate }}</template>
      <template #cell-user="{ row }">
        <div>
          <div class="font-medium">{{ row.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted font-mono">{{ row.report.userId }}</div>
        </div>
      </template>
      <template #cell-totalAmount="{ row }">
        <span class="font-medium">{{ fmtTwd(row.report.totalAmount) }}</span>
      </template>
      <template #cell-txCount="{ row }">
        <span class="text-text-muted">{{ row.report.txIds.length }}</span>
      </template>
      <template #cell-status="{ row }">
        <BaseBadge :variant="reportStatusVariant(row.report.status)">{{ row.report.status }}</BaseBadge>
      </template>
      <template #cell-submittedAt="{ row }">
        <span class="text-text-muted text-xs">{{ fmtDt(row.report.submittedAt) }}</span>
      </template>
      <template #cell-action="{ row }">
        <div class="text-right" @click.stop>
          <BaseButton
            v-if="row.report.status === 'draft'"
            variant="secondary"
            size="sm"
            class="!border-primary-900 !text-primary-900"
            @click="onMark(row.report.id, 'submitted')"
          >
            {{ $t('bank.ctr.submitCta') }}
          </BaseButton>
          <BaseButton
            v-else-if="row.report.status === 'submitted'"
            variant="secondary"
            size="sm"
            class="!border-success !text-success"
            @click="onMark(row.report.id, 'accepted')"
          >
            {{ $t('bank.ctr.markAccept') }}
          </BaseButton>
          <span v-else class="text-xs text-text-muted">—</span>
        </div>
      </template>
      <template #row-expanded="{ row }">
        <div class="-mx-4 -my-3 px-8 py-3 bg-neutral-50 text-xs space-y-3">
          <div>
            <div class="font-semibold mb-1">{{ $t('bank.ctr.txIds') }}</div>
            <ul class="font-mono space-y-0.5">
              <li v-for="tx in row.report.txIds" :key="tx">{{ tx }}</li>
            </ul>
          </div>
          <div class="flex gap-2 items-center pt-2 border-t border-border">
            <span class="text-text-muted">{{ $t('bank.ctr.exportTitle') }}</span>
            <a
              :href="`/api/bank/ctr/${row.report.id}/export?format=json`"
              class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
              download
            >{{ $t('bank.common.exportJson') }}</a>
            <a
              :href="`/api/bank/ctr/${row.report.id}/export?format=xml`"
              class="px-2 py-1 border border-border rounded hover:bg-surface-alt"
              download
            >{{ $t('bank.common.exportXml') }}</a>
          </div>
        </div>
      </template>
    </BaseTable>
  </div>
</template>
