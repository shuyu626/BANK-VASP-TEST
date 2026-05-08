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

// ─── A11y：focus trap、initial focus、restore focus、Escape、scroll lock ───

const dialogRef = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null
const titleId = `modal-${Math.random().toString(36).slice(2, 8)}`

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFocusable(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
}

function focusInitial() {
  if (!import.meta.client || !dialogRef.value) return
  const focusables = getFocusable()
  const target = focusables[0] ?? dialogRef.value
  // 用 setTimeout 等 DOM 完成 transition / Teleport 掛載
  setTimeout(() => target.focus({ preventScroll: true }), 0)
}

function onKeydown(e: KeyboardEvent) {
  if (!props.modelValue) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab') return
  const focusables = getFocusable()
  if (focusables.length === 0) {
    e.preventDefault()
    dialogRef.value?.focus({ preventScroll: true })
    return
  }
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first || !dialogRef.value?.contains(active)) {
      e.preventDefault()
      last.focus({ preventScroll: true })
    }
  } else {
    if (active === last) {
      e.preventDefault()
      first.focus({ preventScroll: true })
    }
  }
}

watch(() => props.modelValue, (open) => {
  if (!import.meta.client) return
  if (open) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    nextTick(() => focusInitial())
  } else {
    document.body.style.overflow = ''
    previouslyFocused?.focus({ preventScroll: true })
    previouslyFocused = null
  }
}, { immediate: false })

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
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
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title || $slots.title ? titleId : undefined"
        tabindex="-1"
        class="bg-surface rounded-lg w-full p-6 shadow-lg outline-none"
        :class="widthClass"
        @click.stop
      >
        <h3 v-if="title || $slots.title" :id="titleId" class="text-lg font-semibold mb-3">
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
