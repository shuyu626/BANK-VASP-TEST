<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const { toasts, dismiss } = useToast()
const { t } = useI18n({ useScope: 'global' })

const variantClass: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
  info: 'bg-info text-white'
}

const iconName: Record<ToastType, string> = {
  success: 'lucide:check',
  error: 'lucide:circle-x',
  warning: 'lucide:triangle-alert',
  info: 'lucide:info'
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none max-w-[calc(100vw-3rem)]">
      <transition-group name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          role="status"
          aria-live="polite"
          class="flex items-start gap-3 px-4 py-3 rounded-md shadow-lg text-sm pointer-events-auto min-w-[14rem] max-w-md"
          :class="variantClass[toast.type]"
        >
          <Icon :name="iconName[toast.type]" class="shrink-0 mt-0.5 text-base" aria-hidden="true" />

          <div class="flex-1 min-w-0 leading-snug break-words">{{ toast.message }}</div>

          <button
            type="button"
            class="shrink-0 -mr-1 inline-flex items-center justify-center w-5 h-5 rounded hover:bg-white/20 transition opacity-80 hover:opacity-100"
            :aria-label="t('common.action.close')"
            @click="dismiss(toast.id)"
          >
            <Icon name="lucide:x" class="text-xs" aria-hidden="true" />
          </button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
