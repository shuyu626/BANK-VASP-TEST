<script setup lang="ts">
const model = defineModel<boolean>({ required: true })

const props = withDefaults(defineProps<{
  title?: string
  /** max-w 寬度 token */
  width?: 'sm' | 'md' | 'lg'
  /** 點擊背景是否關閉，預設 true */
  closeOnBackdrop?: boolean
}>(), {
  width: 'md',
  closeOnBackdrop: true
})

const { register, unregister, isTop } = usePopupStack()
const popupId = ref<number | null>(null)

function close() {
  model.value = false
}

// 背景關閉：mousedown 與 mouseup 必須「都」落在背景才算數，
// 否則在 dialog 內拖選文字、放開時滑到背景，會被當成關閉。
let backdropMousedown = false
function onBackdropMousedown(e: MouseEvent) {
  backdropMousedown = e.target === e.currentTarget
}
function onBackdropMouseup(e: MouseEvent) {
  const wasOnBackdrop = backdropMousedown
  backdropMousedown = false
  if (!wasOnBackdrop) return
  if (e.target !== e.currentTarget) return
  if (!props.closeOnBackdrop) return
  if (popupId.value === null || !isTop(popupId.value)) return
  close()
}

const widthClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
}[props.width]))

// ─── A11y：focus trap、初始 focus、關閉後 restore focus、Escape 關閉 ───
// scroll lock 已交由 usePopupStack 統一處理，這裡不再手動操作 body.style。

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
  // 延後一個 tick，等 Teleport 掛載與 CSS transition 完成才 focus，否則 focus 會丟失。
  setTimeout(() => target.focus({ preventScroll: true }), 0)
}

function onKeydown(e: KeyboardEvent) {
  if (!model.value) return
  // 多層彈窗時只有最上層處理 Escape，否則 confirm 疊在 modal 上時兩層會一起關。
  if (popupId.value === null || !isTop(popupId.value)) return
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

watch(model, (open) => {
  if (!import.meta.client) return
  if (open) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    popupId.value = register()
    nextTick(() => focusInitial())
  } else {
    if (popupId.value !== null) {
      unregister(popupId.value)
      popupId.value = null
    }
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
  // 元件在開啟狀態被卸載（例如路由切換）時也要釋放 stack，否則 body 會卡在鎖定狀態。
  if (popupId.value !== null) {
    unregister(popupId.value)
    popupId.value = null
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="model"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-30 px-4"
      @mousedown="onBackdropMousedown"
      @mouseup="onBackdropMouseup"
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
