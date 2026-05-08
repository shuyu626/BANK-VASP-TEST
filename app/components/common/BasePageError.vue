<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: string
  title?: string
  retryLabel?: string
  /** 是否顯示為 panel（含框與背景），預設 true */
  panel?: boolean
}>(), {
  title: '',
  retryLabel: '',
  panel: true
})

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const finalTitle = computed(() => props.title || t('components.pageError.title'))
const finalRetry = computed(() => props.retryLabel || t('components.pageError.retry'))
</script>

<template>
  <div
    role="alert"
    :class="[
      'flex flex-col items-center justify-center text-center gap-3 py-12 px-6',
      panel ? 'bg-surface border border-border rounded' : ''
    ]"
  >
    <Icon name="lucide:alert-triangle" size="32" class="text-danger" aria-hidden="true" />
    <div class="text-base font-semibold text-text">{{ finalTitle }}</div>
    <div class="text-sm text-text-muted max-w-md break-all">{{ message }}</div>
    <button
      type="button"
      class="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded border border-border text-sm hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      @click="emit('retry')"
    >
      <Icon name="lucide:refresh-cw" size="14" aria-hidden="true" />
      {{ finalRetry }}
    </button>
  </div>
</template>
