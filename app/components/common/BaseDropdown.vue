<script lang="ts">
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

// 注意：此泛型參數需與 <script setup generic="..."> 同步維護
export interface DropdownItem<Value extends string | number = string, Context = unknown> {
  label: string
  value: Value
  disabled?: boolean
  context?: Context
  /** 點擊處理；回傳值忽略 */
  onClick?: (value: Value) => void
  /** 覆寫 component 層級的 closeOnSelect；常用於「執行非同步動作後手動關閉」 */
  closeOnSelect?: boolean
}

export interface DropdownTriggerProps {
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string
}
</script>

<script setup lang="ts" generic="Value extends string | number, Context = unknown">
import type { Slot } from 'vue'

const props = withDefaults(defineProps<{
  items: DropdownItem<Value, Context>[]
  placement?: DropdownPlacement
  /** 觸發器與選單之間的距離，預設 8px */
  offset?: number
  /** 選單最小寬度（px） */
  minWidth?: number
  /** 全部 disabled */
  disabled?: boolean
  /** 觸發方式；hover 僅 desktop 適用，預設 click */
  trigger?: 'click' | 'hover'
  /**
   * 目前選中的 value（select-like 用法）。
   * - 有提供：開啟時自動聚焦該項目，且套用 `aria-current` 與高亮樣式
   * - 未提供：開啟時聚焦第一項（標準 menu pattern）
   */
  selectedValue?: Value | null
  /** 點選 item 後是否自動關閉，預設 true。item 層級可覆寫 */
  closeOnSelect?: boolean
  /** 無 items 時顯示的文字（也可用 #empty slot 完全自訂） */
  emptyText?: string
}>(), {
  placement: 'bottom-start',
  offset: 8,
  trigger: 'click',
  closeOnSelect: true,
  emptyText: '—'
})

defineSlots<{
  /**
   * 觸發器 slot。click 模式下，wrapper 會攔截冒泡的 click 來切換 open，
   * 因此 slot 內的 button **不要**自行綁 toggle handler — 會造成雙重切換。
   * 若需程式化控制開合，請用 template ref 取 `defineExpose` 中的 `toggle` / `close`。
   */
  trigger?: (props: {
    open: boolean
    /** 綁到實際 button 上，把 ARIA 屬性正確關聯到觸發元素 */
    triggerProps: DropdownTriggerProps
  }) => ReturnType<Slot>
  menuitem?: (props: { label: string; value: Value; disabled: boolean; context: Context | undefined }) => ReturnType<Slot>
  empty?: () => ReturnType<Slot>
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const uid = useId()
const menuId = `base-dropdown-menu-${uid}`

let previouslyFocused: HTMLElement | null = null
let suppressFocusRestore = false
let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null

function clearHoverTimer() {
  if (hoverCloseTimer !== null) {
    clearTimeout(hoverCloseTimer)
    hoverCloseTimer = null
  }
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}
function close() {
  open.value = false
}

// 外部程式化操作：dropdownRef.value?.toggle() / close()。請勿直接 mutate `open`。
defineExpose({ open, toggle, close })

const triggerProps = computed<DropdownTriggerProps>(() => ({
  'aria-haspopup': 'menu',
  'aria-expanded': open.value,
  'aria-controls': menuId
}))

const placementClass = computed(() => ({
  'bottom-start': 'top-full left-0',
  'bottom-end': 'top-full right-0',
  'top-start': 'bottom-full left-0',
  'top-end': 'bottom-full right-0'
}[props.placement]))

const offsetStyle = computed(() => {
  const v = `${props.offset}px`
  return props.placement.startsWith('bottom') ? { marginTop: v } : { marginBottom: v }
})

const enterFromTranslate = computed(() =>
  props.placement.startsWith('bottom') ? '-translate-y-1' : 'translate-y-1'
)

const hasSelection = computed(() =>
  props.selectedValue !== undefined && props.selectedValue !== null
)

function isSelected(value: Value): boolean {
  return hasSelection.value && value === props.selectedValue
}

interface ComposedItem {
  label: string
  value: Value
  context: Context | undefined
  disabled: boolean
  selected: boolean
  onClick: () => void
}

const itemsCompose = computed<ComposedItem[]>(() =>
  props.items.map((item) => {
    const disabled = props.disabled || !!item.disabled
    const shouldClose = item.closeOnSelect ?? props.closeOnSelect
    return {
      label: item.label,
      value: item.value,
      context: item.context,
      disabled,
      selected: isSelected(item.value),
      onClick: () => {
        if (disabled) return
        item.onClick?.(item.value)
        if (shouldClose) close()
      }
    }
  })
)

// Roving tabindex：只有 focusedIndex 對應的 item 是 tabindex=0，其餘 -1。
// 這樣 Tab 鍵會自然離開 menu，符合 WAI-ARIA Menu Pattern。
const focusedIndex = ref(-1)

function getItemEl(index: number): HTMLElement | undefined {
  return menuRef.value?.querySelector<HTMLElement>(`[role="menuitem"][data-index="${index}"]`) ?? undefined
}

/**
 * 跳到指定 index；若該 item 被 disabled，沿 direction 方向尋找下個 enabled item。
 * 全部 disabled 時不更動 focus。
 */
function focusAt(index: number, direction: 1 | -1 = 1) {
  const items = itemsCompose.value
  const len = items.length
  if (len === 0) return
  let next = ((index % len) + len) % len
  for (let i = 0; i < len; i++) {
    if (!items[next]!.disabled) break
    next = (((next + direction) % len) + len) % len
  }
  if (items[next]!.disabled) return
  focusedIndex.value = next
  // tabindex 透過 reactivity 在下個 tick 更新，但 .focus() 本身不需要 tabindex=0
  // 即可生效，所以可以同步 focus，使用者後續按 Tab 才會用到更新後的 tabindex。
  getItemEl(next)?.focus({ preventScroll: true })
}

function focusInitial() {
  const items = itemsCompose.value
  if (items.length === 0) return
  if (hasSelection.value) {
    const idx = items.findIndex(i => i.value === props.selectedValue)
    if (idx >= 0 && !items[idx]!.disabled) {
      focusAt(idx, 1)
      return
    }
  }
  focusAt(0, 1)
}

function onMenuKeydown(e: KeyboardEvent) {
  const items = itemsCompose.value
  if (items.length === 0) return
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      focusAt(focusedIndex.value < 0 ? 0 : focusedIndex.value + 1, 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      focusAt(focusedIndex.value < 0 ? items.length - 1 : focusedIndex.value - 1, -1)
      break
    case 'Home':
      e.preventDefault()
      focusAt(0, 1)
      break
    case 'End':
      e.preventDefault()
      focusAt(items.length - 1, -1)
      break
    case 'Tab':
      // 讓瀏覽器自然 Tab 行為帶焦點離開 menu；不要把焦點搶回 trigger
      suppressFocusRestore = true
      close()
      break
  }
}

function onItemKeydown(e: KeyboardEvent, item: ComposedItem) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    item.onClick()
  }
}

function onTriggerClick() {
  // hover 模式由 mouseenter/mouseleave 控制，避免「hover 已開 → 點一下又關」
  if (props.trigger === 'hover') return
  toggle()
}

function onDocumentMousedown(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  if (rootRef.value?.contains(target)) return
  close()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}

function onTriggerMouseEnter() {
  if (props.disabled) return
  clearHoverTimer()
  open.value = true
}
function onTriggerMouseLeave() {
  clearHoverTimer()
  hoverCloseTimer = setTimeout(() => { open.value = false }, 120)
}
function onMenuMouseEnter() {
  clearHoverTimer()
}
function onMenuMouseLeave() {
  clearHoverTimer()
  hoverCloseTimer = setTimeout(() => { open.value = false }, 120)
}

const rootHoverListeners = computed(() =>
  props.trigger === 'hover'
    ? { mouseenter: onTriggerMouseEnter, mouseleave: onTriggerMouseLeave }
    : {}
)
const menuHoverListeners = computed(() =>
  props.trigger === 'hover'
    ? { mouseenter: onMenuMouseEnter, mouseleave: onMenuMouseLeave }
    : {}
)

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nextTick(() => focusInitial())
  } else {
    if (!suppressFocusRestore) {
      previouslyFocused?.focus({ preventScroll: true })
    }
    previouslyFocused = null
    suppressFocusRestore = false
    focusedIndex.value = -1
  }
})

// 動態 disabled 時自動關閉，避免 menu 卡在開啟狀態
watch(() => props.disabled, (d) => {
  if (d && open.value) {
    clearHoverTimer()
    close()
  }
})

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMousedown)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
  document.removeEventListener('keydown', onDocumentKeydown)
  clearHoverTimer()
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative inline-block"
    v-on="rootHoverListeners"
  >
    <div class="inline-flex" @click="onTriggerClick">
      <slot name="trigger" :open="open" :trigger-props="triggerProps" />
    </div>

    <Transition
      enter-active-class="transition duration-150"
      :enter-from-class="`opacity-0 ${enterFromTranslate}`"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 translate-y-0"
      :leave-to-class="`opacity-0 ${enterFromTranslate}`"
    >
      <ul
        v-if="open"
        :id="menuId"
        ref="menuRef"
        role="menu"
        tabindex="-1"
        class="absolute bg-surface border border-border rounded-md shadow-lg py-1 z-30 outline-none overflow-y-auto max-h-72"
        :class="placementClass"
        :style="{ ...offsetStyle, minWidth: minWidth ? `${minWidth}px` : undefined }"
        @keydown="onMenuKeydown"
        v-on="menuHoverListeners"
      >
        <li
          v-for="(item, index) in itemsCompose"
          :key="String(item.value)"
          role="menuitem"
          :data-index="index"
          :data-value="String(item.value)"
          :tabindex="item.disabled || index !== focusedIndex ? -1 : 0"
          :aria-disabled="item.disabled || undefined"
          :aria-current="item.selected ? 'true' : undefined"
          class="px-3 py-1.5 text-sm cursor-pointer select-none transition-colors"
          :class="[
            item.disabled
              ? 'text-text-muted opacity-50 cursor-not-allowed'
              : 'text-text hover:bg-surface-alt focus:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500/40',
            !item.disabled && item.selected ? 'bg-primary-500/10 text-primary-700' : ''
          ]"
          @click="item.onClick"
          @keydown="onItemKeydown($event, item)"
        >
          <slot
            name="menuitem"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
            :context="item.context"
          >
            {{ item.label }}
          </slot>
        </li>
        <li
          v-if="itemsCompose.length === 0"
          class="px-3 py-2 text-xs text-text-muted text-center select-none"
        >
          <slot name="empty">{{ emptyText }}</slot>
        </li>
      </ul>
    </Transition>
  </div>
</template>
