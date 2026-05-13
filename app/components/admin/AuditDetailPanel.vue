<script setup lang="ts">
import type { AuditLog } from '~~/shared/types'

defineProps<{ entry: AuditLog | null }>()
defineEmits<{ close: [] }>()

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
  } catch {
    // clipboard API may not be available on every browser/permissions; silently noop
  }
}
</script>

<template>
  <aside class="bg-surface border border-border rounded h-full flex flex-col">
    <header class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <span class="text-xs uppercase tracking-wider text-text-muted">
        {{ $t('admin.audit.stream.detail.title') }}
      </span>
      <button
        v-if="entry"
        type="button"
        class="text-text-muted hover:text-text text-lg leading-none px-2"
        :aria-label="$t('admin.audit.stream.detail.closeCta')"
        @click="$emit('close')"
      >×</button>
    </header>
    <div v-if="entry" class="p-4 space-y-3 overflow-y-auto text-sm flex-1">
      <div class="flex items-baseline gap-2 flex-wrap">
        <span class="text-text-muted text-xs">id</span>
        <span class="font-mono text-xs break-all">{{ entry.id }}</span>
        <button
          type="button"
          class="text-primary-500 text-xs hover:underline"
          @click="copyId(entry.id)"
        >{{ $t('admin.audit.stream.detail.copyIdCta') }}</button>
      </div>
      <div>
        <span class="text-text-muted text-xs">{{ $t('common.label.time') }}</span>
        <div class="num text-sm">{{ entry.timestamp }}</div>
      </div>
      <div>
        <span class="text-text-muted text-xs">{{ $t('common.label.actor') }}</span>
        <div class="font-mono text-sm">{{ entry.actor }} <span class="text-text-muted">({{ entry.actorRole }})</span></div>
      </div>
      <div>
        <span class="text-text-muted text-xs">{{ $t('common.label.action') }}</span>
        <div>{{ entry.action }}</div>
      </div>
      <div>
        <span class="text-text-muted text-xs">{{ $t('common.label.resource') }}</span>
        <div class="font-mono text-sm">{{ entry.resourceType }}:{{ entry.resourceId }}</div>
      </div>
      <div>
        <span class="text-text-muted text-xs">{{ $t('common.label.ip') }}</span>
        <div class="font-mono text-sm">{{ entry.ipAddress ?? '—' }}</div>
      </div>
      <div>
        <div class="text-text-muted text-xs mb-1">metadata</div>
        <pre class="bg-surface-alt p-3 rounded text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
      </div>
    </div>
    <div v-else class="p-8 text-center text-text-muted text-xs flex-1 flex items-center justify-center">
      {{ $t('admin.audit.stream.detail.placeholder') }}
    </div>
  </aside>
</template>
