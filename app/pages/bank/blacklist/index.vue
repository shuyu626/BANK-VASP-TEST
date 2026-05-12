<script setup lang="ts">
import type { BlacklistEntry } from '~~/shared/utils/blacklist'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.blacklist') }))

const { data, errorMessage, refresh } = await useBankResource<{ entries: BlacklistEntry[] }>('/api/bank/blacklist')
const entries = computed(() => data.value?.entries ?? [])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.blacklist.title')" :subtitle="$t('bank.blacklist.subtitle')" />

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('admin.blacklist.thPattern') }}</th>
            <th>{{ $t('admin.blacklist.thReason') }}</th>
            <th>{{ $t('admin.blacklist.thSource') }}</th>
            <th>{{ $t('admin.blacklist.thCreatedAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="4" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="entries.length === 0">
            <td colspan="4" class="text-center text-text-muted py-10">{{ $t('admin.blacklist.empty') }}</td>
          </tr>
          <tr v-for="e in entries" :key="e.id">
            <td class="font-mono text-xs break-all max-w-xs">{{ e.pattern }}</td>
            <td class="text-sm">{{ e.reason }}</td>
            <td class="text-xs">{{ e.source }}</td>
            <td class="text-xs text-text-muted">{{ e.createdAt ? fmtDt(e.createdAt) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
