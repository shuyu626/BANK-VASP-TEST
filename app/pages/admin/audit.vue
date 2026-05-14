<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useAuditStream } from '~/composables/useAuditStream'
import AuditFilterBar from '~/components/admin/AuditFilterBar.vue'
import AuditStreamRow from '~/components/admin/AuditStreamRow.vue'
import AuditDetailPanel from '~/components/admin/AuditDetailPanel.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.audit') }))
const route = useRoute()
const router = useRouter()
const toast = useToast()

const stream = useAuditStream()
await stream.loadInitial()

// Deep-link via ?selected=<id>
const initialSelected = route.query.selected
if (typeof initialSelected === 'string' && initialSelected) {
  if (stream.allEntries.value.some(e => e.id === initialSelected)) {
    stream.selectedId.value = initialSelected
  } else {
    toast.show(t('admin.audit.stream.deepLinkMissing'), 'warning')
  }
}
watch(() => stream.selectedId.value, (id) => {
  router.replace({ query: { ...route.query, selected: id ?? undefined } })
})

// Virtualizer
const parentRef = ref<HTMLElement | null>(null)
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: stream.filteredEntries.value.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 44,
    overscan: 10
  }))
)

// Scroll to selected after initial load
watch(
  () => stream.selectedEntry.value,
  (entry) => {
    if (!entry) return
    const idx = stream.filteredEntries.value.findIndex(e => e.id === entry.id)
    if (idx !== -1) rowVirtualizer.value.scrollToIndex(idx, { align: 'center' })
  },
  { immediate: true }
)

async function handleJumpToDate(date: string) {
  const result = await stream.jumpToDate(date)
  if ('error' in result) {
    toast.show(t('admin.audit.stream.errorNoData', { oldest: result.oldest ?? '—' }), 'warning')
    return
  }
  rowVirtualizer.value.scrollToIndex(result.index, { align: 'start' })
}

function selectEntry(id: string) {
  stream.selectedId.value = id
}

const isMobileOverlayOpen = computed(() => stream.selectedId.value !== null)
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader
      :title="$t('admin.audit.stream.title')"
      :subtitle="$t('admin.audit.stream.subtitle')"
    />

    <AuditFilterBar
      v-model="stream.filters.value"
      @export-csv="stream.exportCsv()"
      @jump-to-date="handleJumpToDate"
      @reset="stream.resetFilters()"
    />

    <div class="flex items-center justify-between text-xs text-text-muted">
      <span>
        {{
          t('admin.audit.stream.statsBar', {
            shown: stream.filteredEntries.value.length,
            loaded: stream.allEntries.value.length,
            total: stream.totalInStore.value
          })
        }}
      </span>
      <BaseButton
        variant="secondary"
        size="sm"
        :loading="stream.isLoadingMore.value"
        :disabled="stream.isLoadingMore.value"
        @click="stream.loadEarlier()"
      >
        {{ $t('admin.audit.stream.loadEarlier') }}
      </BaseButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <section class="lg:col-span-7 bg-surface border border-border rounded overflow-hidden">
        <!-- Header row -->
        <div class="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-text-muted border-b border-border bg-surface-alt uppercase tracking-wider">
          <span class="col-span-3 min-w-0 truncate">{{ $t('common.label.time') }}</span>
          <span class="col-span-2 min-w-0 truncate">{{ $t('admin.audit.stream.thRole') }}</span>
          <span class="col-span-2 min-w-0 truncate">{{ $t('common.label.actor') }}</span>
          <span class="col-span-2 min-w-0 truncate">{{ $t('common.label.action') }}</span>
          <span class="col-span-2 min-w-0 truncate">{{ $t('common.label.resource') }}</span>
          <span class="col-span-1 min-w-0 truncate">{{ $t('common.label.ip') }}</span>
        </div>
        <div
          v-if="stream.filteredEntries.value.length === 0"
          class="p-8 text-center text-text-muted text-xs"
        >{{ $t('admin.audit.stream.emptyFiltered') }}</div>
        <div
          v-else
          ref="parentRef"
          class="overflow-auto h-[calc(100vh-360px)] min-h-[400px]"
        >
          <div
            :style="{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%'
            }"
          >
            <AuditStreamRow
              v-for="vrow in rowVirtualizer.getVirtualItems()"
              :key="stream.filteredEntries.value[vrow.index]?.id"
              :entry="stream.filteredEntries.value[vrow.index]!"
              :active="stream.selectedId.value === stream.filteredEntries.value[vrow.index]?.id"
              :style="{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '44px',
                transform: `translateY(${vrow.start}px)`
              }"
              @select="(e) => selectEntry(e.id)"
            />
          </div>
        </div>
      </section>

      <!-- Desktop side panel -->
      <div class="hidden lg:block lg:col-span-5">
        <AuditDetailPanel
          :entry="stream.selectedEntry.value"
          @close="stream.selectedId.value = null"
        />
      </div>

      <!-- Mobile overlay -->
      <Transition name="audit-slide">
        <div
          v-if="isMobileOverlayOpen"
          class="lg:hidden fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-xl"
        >
          <AuditDetailPanel
            :entry="stream.selectedEntry.value"
            @close="stream.selectedId.value = null"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.audit-slide-enter-from,
.audit-slide-leave-to {
  transform: translateX(100%);
}
.audit-slide-enter-active,
.audit-slide-leave-active {
  transition: transform 200ms ease;
}
</style>
