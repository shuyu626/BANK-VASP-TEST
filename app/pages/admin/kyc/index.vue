<script setup lang="ts">
import type { KycRecord, User, KycStatus } from '~~/shared/types'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.kyc') }))

interface Item { record: KycRecord; user?: User }

const tab = ref<KycStatus | 'all'>('pending')

const { data, loading, error, refetch } = useApiResource<{ items: Item[] }>(
  '/api/admin/kyc',
  {
    query: () => ({ status: tab.value === 'all' ? undefined : tab.value }),
    watchSources: [tab]
  }
)
await refetch()
const items = computed(() => data.value?.items ?? [])

const { paged: pagedItems, bindings: itemsBindings } = usePagination<Item>({
  source: () => items.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
})

const tabs = computed<{ value: KycStatus | 'all'; label: string }[]>(() => [
  { value: 'pending', label: t('admin.kyc.tab.pending') },
  { value: 'approved', label: t('admin.kyc.tab.approved') },
  { value: 'rejected', label: t('admin.kyc.tab.rejected') },
  { value: 'all', label: t('admin.kyc.tab.all') }
])
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.kyc.title')" />

    <BaseTabBar v-model="tab" :options="tabs" />

    <BaseTable
      :colspan="6"
      :empty="items.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.kyc.empty')"
      :skeleton-rows="5"
      @retry="refetch"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('admin.kyc.th.submitTime') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.tier') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.idNumberShort') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
        </tr>
      </template>
      <tr v-for="it in pagedItems" :key="it.record.id" class="border-b border-border last:border-0 hover:bg-surface-alt">
        <td class="px-4 py-3 num text-text-muted">{{ fmtDt(it.record.submittedAt) }}</td>
        <td class="px-4 py-3">
          <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted">{{ it.user?.email }}</div>
        </td>
        <td class="px-4 py-3 text-xs">{{ it.record.tier }}</td>
        <td class="px-4 py-3">
          <BaseBadge :variant="kycVariant(it.record.status)">
            {{ it.record.status }}
          </BaseBadge>
        </td>
        <td class="px-4 py-3 font-mono text-xs">{{ it.record.idNumber }}</td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/admin/kyc/${it.record.id}`" class="text-xs text-primary-700 hover:underline">
            {{ $t('common.action.viewDetail') }}
          </NuxtLink>
        </td>
      </tr>
      <template #footer>
        <BasePagination v-bind="itemsBindings" show-first-button show-last-button />
      </template>
    </BaseTable>
  </div>
</template>
