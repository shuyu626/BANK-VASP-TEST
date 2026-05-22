<script setup lang="ts">
import type { BlacklistEntry } from '~~/shared/utils/blacklist'
import { AddBlacklistInputSchema, type AddBlacklistInput } from '~~/shared/types'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.blacklist') }))

const toast = useToast()
const { confirm } = useConfirm()

const submitting = ref(false)
const formError = ref<string | null>(null)

const { data, loading, error: listError, refetch } = useApiResource<{ entries: BlacklistEntry[] }>(
  '/api/admin/blacklist'
)
await refetch()
const entries = computed(() => data.value?.entries ?? [])

const { paged: pagedEntries, bindings: entriesBindings } = usePagination<BlacklistEntry>({
  source: () => entries.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
})

const form = reactive<AddBlacklistInput>({
  pattern: '',
  reason: '',
  source: ''
})

const parsed = computed(() => AddBlacklistInputSchema.safeParse(form))
const canSubmit = computed(() => parsed.value.success && !submitting.value)

function humanize(code: string | null | undefined): string {
  switch (code) {
    case 'VALIDATION_ERROR': return t('admin.blacklist.errValidation')
    case 'DUPLICATE_PATTERN': return t('admin.blacklist.errDuplicate')
    default: return code ?? t('admin.blacklist.errDefault')
  }
}
async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  formError.value = null
  try {
    await $fetch<{ entry: BlacklistEntry }>('/api/admin/blacklist', {
      method: 'POST', body: { ...form }
    })
    await refetch()
    form.pattern = ''
    form.reason = ''
    form.source = ''
    toast.success(t('admin.blacklist.addSuccess'))
  } catch (err: unknown) {
    formError.value = humanize(extractErrorMessage(err))
  } finally {
    submitting.value = false
  }
}

async function onRemove(id: string) {
  const ok = await confirm({
    message: t('admin.blacklist.removeConfirm'),
    variant: 'danger'
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' })
    await refetch()
    toast.success(t('admin.blacklist.removeSuccess'))
  } catch (err: unknown) {
    toast.error(humanize(extractErrorMessage(err)))
  }
}

function isDynamic(e: BlacklistEntry): boolean {
  return !!e.createdAt
}
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader
      :title="$t('admin.blacklist.title')"
      :subtitle="$t('admin.blacklist.subtitle')"
    />

    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.blacklist.addTitle') }}</h2>
      <form class="space-y-3 max-w-2xl" @submit.prevent="onSubmit">
        <BaseInput
          v-model="form.pattern"
          :label="$t('admin.blacklist.patternLabel')"
          :hint="$t('admin.blacklist.patternHint')"
          input-class="font-mono"
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseInput v-model="form.reason" :label="$t('admin.blacklist.reasonLabel')" />
          <BaseInput
            v-model="form.source"
            :label="$t('admin.blacklist.sourceLabel')"
            :placeholder="$t('admin.blacklist.sourcePlaceholder')"
          />
        </div>
        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!canSubmit"
          :loading="submitting"
        >
          {{ $t('admin.blacklist.submitCta') }}
        </BaseButton>
      </form>
    </section>

    <section>
      <h2 class="text-sm font-semibold mb-3">{{ $t('admin.blacklist.listTitle') }}</h2>
      <BaseTable
        :colspan="6"
        :empty="entries.length === 0"
        :loading="loading"
        :error-message="listError"
        :empty-text="$t('admin.blacklist.empty')"
        :skeleton-rows="4"
        @retry="refetch"
      >
        <template #head>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-4 py-3 font-medium">{{ $t('admin.blacklist.thPattern') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('admin.blacklist.thReason') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('admin.blacklist.thSource') }}</th>
            <th class="text-left px-4 py-3 font-medium">{{ $t('admin.blacklist.thCreatedAt') }}</th>
            <th class="text-left px-4 py-3 font-medium" />
            <th class="text-right px-4 py-3 font-medium">{{ $t('admin.blacklist.thAction') }}</th>
          </tr>
        </template>
        <tr v-for="e in pagedEntries" :key="e.id" class="border-b border-border last:border-0">
          <td class="px-4 py-3 font-mono text-xs break-all max-w-xs">{{ e.pattern }}</td>
          <td class="px-4 py-3 text-sm">{{ e.reason }}</td>
          <td class="px-4 py-3 text-xs">{{ e.source }}</td>
          <td class="px-4 py-3 text-xs text-text-muted">{{ e.createdAt ? fmtDt(e.createdAt) : '—' }}</td>
          <td class="px-4 py-3">
            <BaseBadge :variant="isDynamic(e) ? 'brand' : 'neutral'" size="sm" :solid="false">
              {{ isDynamic(e) ? $t('admin.blacklist.dynamicBadge') : $t('admin.blacklist.seedBadge') }}
            </BaseBadge>
          </td>
          <td class="px-4 py-3 text-right">
            <BaseButton
              v-if="isDynamic(e)"
              variant="secondary"
              size="sm"
              tone="danger"
              @click="onRemove(e.id)"
            >
              {{ $t('admin.blacklist.removeCta') }}
            </BaseButton>
            <span v-else class="text-text-muted text-xs">—</span>
          </td>
        </tr>
        <template #footer>
          <BasePagination v-bind="entriesBindings" show-first-button show-last-button />
        </template>
      </BaseTable>
    </section>
  </div>
</template>
