<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  /** max-w 寬度 token */
  width?: 'sm' | 'md' | 'lg'
  /** 點擊背景是否關閉，預設 true */
  closeOnBackdrop?: boolean
}>(), {
  width: 'md',
  closeOnBackdrop: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}

const widthClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
}[props.width]))

// ESC key close
onMounted(() => {
  if (!import.meta.client) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) close()
  }
  window.addEventListener('keydown', handler)
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-30 px-4"
      @click.self="onBackdrop"
    >
      <div
        class="bg-surface rounded-lg w-full p-6 shadow-lg"
        :class="widthClass"
        @click.stop
      >
        <h3 v-if="title || $slots.title" class="text-lg font-semibold mb-3">
          <slot name="title">{{ title }}</slot>
        </h3>
        <slot />
        <div v-if="$slots.footer" class="flex gap-2 mt-4">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
