<script setup lang="ts">
import type { AuditLog } from '~~/shared/types'

defineProps<{
  entry: AuditLog
  active: boolean
  style: Record<string, string>
}>()
defineEmits<{ select: [AuditLog] }>()

const roleColour: Record<string, string> = {
  user: 'bg-neutral-500/20 text-neutral-700',
  system: 'bg-info/20 text-info',
  compliance: 'bg-primary-700 text-white',
  ops: 'bg-primary-500 text-white',
  risk: 'bg-warning text-white',
  bank: 'bg-gold-500 text-white',
  admin: 'bg-neutral-700 text-white'
}
</script>

<template>
  <div
    :style="style"
    class="grid grid-cols-12 gap-2 px-3 items-center text-xs cursor-pointer border-b border-border hover:bg-surface-alt transition-colors"
    :class="active ? 'bg-primary-500/10 border-l-2 border-primary-500' : 'border-l-2 border-transparent'"
    role="button"
    :aria-pressed="active"
    @click="$emit('select', entry)"
  >
    <span
      class="col-span-3 min-w-0 num text-text-muted whitespace-nowrap truncate"
      :title="entry.timestamp"
    >{{ entry.timestamp.slice(0, 19).replace('T', ' ') }}</span>
    <span class="col-span-2 min-w-0 overflow-hidden">
      <span
        class="inline-block max-w-full text-[10px] uppercase px-1.5 py-0.5 rounded-sm truncate align-middle"
        :class="roleColour[entry.actorRole] ?? 'bg-neutral-300'"
      >{{ entry.actorRole }}</span>
    </span>
    <span class="col-span-2 min-w-0 font-mono truncate" :title="entry.actor">{{ entry.actor }}</span>
    <span class="col-span-2 min-w-0 truncate" :title="entry.action">{{ entry.action }}</span>
    <span
      class="col-span-2 min-w-0 font-mono text-text-muted truncate"
      :title="`${entry.resourceType}:${entry.resourceId}`"
    >{{ entry.resourceType }}:{{ entry.resourceId }}</span>
    <span
      class="col-span-1 min-w-0 font-mono text-text-muted truncate text-[11px]"
      :title="entry.ipAddress ?? ''"
    >{{ entry.ipAddress ?? '—' }}</span>
  </div>
</template>
