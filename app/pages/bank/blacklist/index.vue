<script setup lang="ts">
import type { BlacklistEntry } from '~~/shared/utils/blacklist'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.blacklist') }))

const { data, errorMessage, refresh } = await useBankResource<{ entries: BlacklistEntry[] }>('/api/bank/blacklist')
const entries = computed(() => data.value?.entries ?? [])

const blacklistColumns = computed(() => [
  { key: 'pattern', label: t('admin.blacklist.thPattern') },
  { key: 'reason', label: t('admin.blacklist.thReason') },
  { key: 'source', label: t('admin.blacklist.thSource') },
  { key: 'createdAt', label: t('admin.blacklist.thCreatedAt') }
])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.blacklist.title')" :subtitle="$t('bank.blacklist.subtitle')" />

    <BaseTable
      :columns="blacklistColumns"
      :items="entries"
      row-key="id"
      :empty-text="$t('admin.blacklist.empty')"
      :error-message="errorMessage"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @retry="refresh()"
    >
      <template #cell-pattern="{ row }">
        <span class="font-mono text-xs break-all max-w-xs">{{ row.pattern }}</span>
      </template>
      <template #cell-reason="{ row }">
        <span class="text-sm">{{ row.reason }}</span>
      </template>
      <template #cell-source="{ row }">
        <span class="text-xs">{{ row.source }}</span>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-xs text-text-muted">{{ row.createdAt ? fmtDt(row.createdAt) : '—' }}</span>
      </template>
    </BaseTable>
  </div>
</template>
