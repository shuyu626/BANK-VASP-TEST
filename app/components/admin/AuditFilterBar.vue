<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { AuditFilters } from '~/composables/useAuditStream'

const model = defineModel<AuditFilters>({ required: true })
const emit = defineEmits<{
  exportCsv: []
  jumpToDate: [date: string]
  reset: []
}>()

// localSearch + 300ms debounce, then commit to model.searchText
const localSearch = ref(model.value.searchText)
const debouncedCommit = useDebounceFn((v: string) => {
  if (model.value.searchText !== v) {
    model.value = { ...model.value, searchText: v }
  }
}, 300)
watch(localSearch, (v) => debouncedCommit(v))
watch(() => model.value.searchText, (v) => {
  // sync external resets back to local input
  if (v !== localSearch.value) localSearch.value = v
})

const jumpDate = ref('')
function emitJump() {
  if (jumpDate.value) emit('jumpToDate', jumpDate.value)
}

// helpers to bind native date input to ISO model fields
function isoToDate(iso: string): string {
  return iso.slice(0, 10)
}
function dateToIso(date: string, end: boolean): string {
  return end ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`
}
</script>

<template>
  <section class="bg-surface border border-border rounded p-3 space-y-3">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <!-- Row 1: search + filters -->
      <div class="md:col-span-4">
        <BaseInput
          v-model="localSearch"
          type="search"
          :placeholder="$t('admin.audit.stream.filterBar.searchPlaceholder')"
        />
      </div>
      <div class="md:col-span-2">
        <BaseSelect
          v-model="model.actorRole"
          :placeholder="$t('admin.audit.stream.filterBar.actorRoleAll')"
          :options="[
            { value: 'user', label: 'user' },
            { value: 'admin', label: 'admin' },
            { value: 'compliance', label: 'compliance' },
            { value: 'ops', label: 'ops' },
            { value: 'risk', label: 'risk' },
            { value: 'bank', label: 'bank' },
            { value: 'system', label: 'system' }
          ]"
        />
      </div>
      <div class="md:col-span-2">
        <BaseInput v-model="model.actionPrefix" :placeholder="$t('admin.audit.stream.filterBar.actionPlaceholder')" />
      </div>
      <div class="md:col-span-2">
        <BaseInput v-model="model.actor" :placeholder="$t('admin.audit.stream.filterBar.actorPlaceholder')" />
      </div>
      <div class="md:col-span-2">
        <BaseInput v-model="model.resourceId" :placeholder="$t('admin.audit.stream.filterBar.resourcePlaceholder')" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <!-- Row 2: window + jump + reset + export -->
      <div class="md:col-span-2">
        <label class="text-xs text-text-muted block mb-1">{{ $t('admin.audit.stream.filterBar.windowStartLabel') }}</label>
        <input
          type="date"
          class="w-full bg-surface-alt border border-border rounded px-2 py-1.5 text-sm"
          :value="isoToDate(model.windowStart)"
          @input="(e) => model.windowStart = dateToIso((e.target as HTMLInputElement).value, false)"
        />
      </div>
      <div class="md:col-span-2">
        <label class="text-xs text-text-muted block mb-1">{{ $t('admin.audit.stream.filterBar.windowEndLabel') }}</label>
        <input
          type="date"
          class="w-full bg-surface-alt border border-border rounded px-2 py-1.5 text-sm"
          :value="isoToDate(model.windowEnd)"
          @input="(e) => model.windowEnd = dateToIso((e.target as HTMLInputElement).value, true)"
        />
      </div>
      <div class="md:col-span-3">
        <label class="text-xs text-text-muted block mb-1">{{ $t('admin.audit.stream.filterBar.jumpDateLabel') }}</label>
        <div class="flex gap-2">
          <input
            v-model="jumpDate"
            type="date"
            class="flex-1 bg-surface-alt border border-border rounded px-2 py-1.5 text-sm"
            @keyup.enter="emitJump"
          />
          <BaseButton variant="secondary" size="sm" :disabled="!jumpDate" @click="emitJump">
            {{ $t('admin.audit.stream.filterBar.jumpCta') }}
          </BaseButton>
        </div>
      </div>
      <div class="md:col-span-2 flex gap-2">
        <BaseButton variant="ghost" size="sm" block @click="emit('reset')">
          {{ $t('admin.audit.stream.filterBar.resetCta') }}
        </BaseButton>
      </div>
      <div class="md:col-span-3 flex gap-2 justify-end">
        <BaseButton variant="primary" size="sm" @click="emit('exportCsv')">
          {{ $t('admin.audit.stream.filterBar.exportCsvCta') }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
