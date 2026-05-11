<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.audit') }))

const reviews = useAdminReviewsStore()
const { auditEntries, loading, error } = storeToRefs(reviews)

const actorRole = ref('')
const actionPrefix = ref('')
const actor = ref('')
const resourceId = ref('')
const limit = ref(100)

async function load() {
  const params: Record<string, string> = { limit: String(limit.value) }
  if (actorRole.value) params.actorRole = actorRole.value
  if (actionPrefix.value) params.action = actionPrefix.value
  if (actor.value) params.actor = actor.value
  if (resourceId.value) params.resourceId = resourceId.value
  await reviews.loadAudit(params)
  pagination.reset()
}

const expanded = ref<Set<string>>(new Set())
function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

// Sort + pagination
type SortKey = 'timestamp' | 'actorRole' | 'actor' | 'action'
const sort = useSortable<SortKey>({ defaultKey: 'timestamp', defaultDir: 'desc' })

const sortedEntries = computed(() =>
  sort.sortBy(auditEntries.value, (row, k) => {
    if (k === 'timestamp') return new Date(row.timestamp)
    return row[k]
  })
)

const pagination = usePagination({
  source: () => sortedEntries.value,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100]
})

await load()

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
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.audit.title')" :subtitle="$t('admin.audit.subtitle')" />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
      <BaseSelect
        v-model="actorRole"
        :options="[
          { value: '', label: $t('admin.audit.filterAllRole') },
          { value: 'user', label: 'user' },
          { value: 'system', label: 'system' },
          { value: 'compliance', label: 'compliance' },
          { value: 'ops', label: 'ops' },
          { value: 'risk', label: 'risk' },
          { value: 'bank', label: 'bank' }
        ]"
      />
      <BaseInput v-model="actionPrefix" :placeholder="$t('admin.audit.filterActionPlaceholder')" />
      <BaseInput v-model="actor" :placeholder="$t('admin.audit.filterActorPlaceholder')" input-class="font-mono" />
      <BaseInput v-model="resourceId" :placeholder="$t('admin.audit.filterResourcePlaceholder')" input-class="font-mono" />
    </div>
    <BaseButton variant="primary" @click="load">{{ $t('common.action.applyFilter') }}</BaseButton>

    <BaseTable
      :colspan="7"
      :empty="pagination.paged.value.length === 0"
      :loading="loading"
      :error-message="error"
      :empty-text="$t('admin.audit.empty')"
      :skeleton-rows="8"
      @retry="load()"
    >
      <template #head>
        <tr class="text-xs text-text-muted border-b border-border">
          <th class="w-8" />
          <BaseSortHeader :sort="sort" sort-key="timestamp" th-class="px-4 py-3 font-medium">{{ $t('common.label.time') }}</BaseSortHeader>
          <BaseSortHeader :sort="sort" sort-key="actorRole" th-class="px-4 py-3 font-medium">{{ $t('admin.role.compliance') }}</BaseSortHeader>
          <BaseSortHeader :sort="sort" sort-key="actor" th-class="px-4 py-3 font-medium">{{ $t('common.label.actor') }}</BaseSortHeader>
          <BaseSortHeader :sort="sort" sort-key="action" th-class="px-4 py-3 font-medium">{{ $t('common.label.action') }}</BaseSortHeader>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.resource') }}</th>
          <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.ip') }}</th>
        </tr>
      </template>
      <template v-for="e in pagination.paged.value" :key="e.id">
        <tr class="border-b border-border hover:bg-surface-alt cursor-pointer" @click="toggle(e.id)">
          <td class="px-3 py-2 text-center text-text-muted">{{ expanded.has(e.id) ? '▼' : '▶' }}</td>
          <td class="px-4 py-2 num text-text-muted whitespace-nowrap text-xs">{{ fmtDt(e.timestamp) }}</td>
          <td class="px-4 py-2">
            <span class="text-[10px] uppercase px-1.5 py-0.5 rounded-sm" :class="roleColour[e.actorRole] ?? 'bg-neutral-300'">
              {{ e.actorRole }}
            </span>
          </td>
          <td class="px-4 py-2 font-mono text-xs">{{ e.actor }}</td>
          <td class="px-4 py-2">{{ e.action }}</td>
          <td class="px-4 py-2 text-xs text-text-muted font-mono">{{ e.resourceType }}:{{ e.resourceId }}</td>
          <td class="px-4 py-2 text-xs font-mono text-text-muted">{{ e.ipAddress ?? '—' }}</td>
        </tr>
        <tr v-if="expanded.has(e.id)" class="border-b border-border">
          <td colspan="7" class="px-8 py-3 bg-neutral-50">
            <pre class="text-xs overflow-x-auto font-mono">{{ JSON.stringify(e.metadata, null, 2) }}</pre>
            <div class="text-xs text-text-muted mt-2">{{ $t('admin.audit.logId') }} <span class="font-mono">{{ e.id }}</span></div>
          </td>
        </tr>
      </template>
      <template #footer>
        <BasePagination v-bind="pagination.bindings.value" />
      </template>
    </BaseTable>
  </div>
</template>
