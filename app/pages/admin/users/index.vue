<script setup lang="ts">
import type { User, KycStatus, RiskLevel } from '~~/shared/types'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.users') }))

const kycFilter = ref<KycStatus | ''>('')
const riskFilter = ref<RiskLevel | ''>('')
const frozenFilter = ref<'' | 'true' | 'false'>('')
const search = ref('')

const { data, loading, error, refetch } = useApiResource<{ users: User[] }>(
  '/api/admin/users',
  {
    query: () => ({
      kycStatus: kycFilter.value || undefined,
      risk: riskFilter.value || undefined,
      frozen: frozenFilter.value || undefined,
      q: search.value || undefined
    }),
    watchSources: [kycFilter, riskFilter, frozenFilter, search]
  }
)
await refetch()

const users = computed(() => data.value?.users ?? [])
const { paged, bindings } = usePagination<User>({
  source: () => users.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50]
})

// 取顯示名稱的首字作為頭像縮寫（中文取第一字、英文取首字母）
function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.users.title')" />

    <!-- 本頁用戶的視覺摘要：疊圖頭像 + 人數，超過 5 位收合成 +N -->
    <div v-if="paged.length" class="flex items-center gap-3">
      <BaseAvatarGroup :max="5" size="small">
        <BaseAvatar v-for="u in paged" :key="u.id" :alt="u.displayName">
          {{ initials(u.displayName) }}
        </BaseAvatar>
      </BaseAvatarGroup>
      <span class="text-sm text-text-muted">{{ $t('admin.users.totalCount', { count: paged.length }) }}</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
      <BaseInput v-model="search" :placeholder="$t('admin.users.search')" />
      <BaseSelect
        v-model="kycFilter"
        :options="[
          { value: '', label: $t('admin.users.filterKyc') },
          { value: 'pending', label: $t('admin.kyc.tab.pending') },
          { value: 'approved', label: $t('admin.kyc.tab.approved') },
          { value: 'rejected', label: $t('admin.kyc.tab.rejected') }
        ]"
      />
      <BaseSelect
        v-model="riskFilter"
        :options="[
          { value: '', label: $t('admin.users.filterRisk') },
          { value: 'low', label: $t('riskLevel.low') },
          { value: 'medium', label: $t('riskLevel.medium') },
          { value: 'high', label: $t('riskLevel.high') },
          { value: 'critical', label: $t('riskLevel.critical') }
        ]"
      />
      <BaseSelect
        v-model="frozenFilter"
        :options="[
          { value: '', label: $t('admin.users.filterFrozen') },
          { value: 'false', label: $t('admin.users.frozenNo') },
          { value: 'true', label: $t('admin.users.frozenYes') }
        ]"
      />
    </div>

    <BaseTable
      :colspan="7"
      :empty="users.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.users.empty')"
      :skeleton-rows="6"
      @retry="refetch"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('admin.users.th.kyc') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.tier') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.riskLevel') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('admin.users.th.create') }}</th>
          <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
        </tr>
      </template>
      <tr v-for="u in paged" :key="u.id" class="border-b border-border last:border-0 hover:bg-surface-alt">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <BaseAvatar size="small" :alt="u.displayName">{{ initials(u.displayName) }}</BaseAvatar>
            <div>
              <div class="font-medium">{{ u.displayName }}</div>
              <div class="text-xs text-text-muted">{{ u.email }}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          <BaseBadge :variant="kycVariant(u.kycStatus)">{{ u.kycStatus }}</BaseBadge>
        </td>
        <td class="px-4 py-3 text-xs">{{ u.kycTier }}</td>
        <td class="px-4 py-3">
          <BaseBadge :variant="riskVariant(u.riskLevel)">{{ u.riskLevel }}</BaseBadge>
        </td>
        <td class="px-4 py-3 text-xs">
          <span v-if="u.isFrozen" class="text-danger font-semibold">{{ $t('admin.users.frozenYes') }}</span>
          <span v-else class="text-text-muted">{{ $t('admin.users.frozenNo') }}</span>
        </td>
        <td class="px-4 py-3 num text-xs text-text-muted">{{ fmtDt(u.createdAt, 'date') }}</td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/admin/users/${u.id}`" class="text-xs text-primary-700 hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
        </td>
      </tr>
      <template #footer>
        <BasePagination v-bind="bindings" show-first-button show-last-button />
      </template>
    </BaseTable>
  </div>
</template>
