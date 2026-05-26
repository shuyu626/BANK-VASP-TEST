<script lang="ts">
export interface BaseTabContext {
  modelValue: Ref<unknown>
  lookup: ComputedRef<Record<string, { id: string, tabpanelId: string }>>
}

export const TABS_INJECT_KEY: InjectionKey<BaseTabContext> = Symbol('BaseTabs')
</script>

<script setup lang="ts" generic="T extends string | number">
import { computed, provide, toRef, useId } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { moveFocus, nextItem, previousItem } from '~/utils/dom'

interface TabOption {
  value: T
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: T
  options: TabOption[]
  /** trader 圓角風格 vs admin 直角風格 */
  rounded?: 'md' | 'sm'
  /** 整體 disabled，覆蓋個別 option 的設定 */
  disabled?: boolean
  /** 用於 tablist 的 aria-label，建議在沒有可見標題時填寫 */
  ariaLabel?: string
  /** tablist 方向；vertical 模式鍵盤改用 ArrowUp/Down 並讓按鈕縱向排列 */
  orientation?: 'horizontal' | 'vertical'
  /**
   * 切換前 hook，可中斷切換。
   * 回傳 `false` 或 resolved `false` → 中斷；回傳 `true` / `undefined` / Promise → 繼續。
   */
  onBeforeChange?: (value: T) => boolean | Promise<boolean> | void
}>(), {
  rounded: 'sm',
  disabled: false,
  ariaLabel: undefined,
  orientation: 'horizontal',
  onBeforeChange: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const uid = useId()

const radiusClass = computed(() => props.rounded === 'md' ? 'rounded-md' : 'rounded')

const tablistClass = computed(() =>
  props.orientation === 'vertical'
    ? 'flex flex-col gap-1 text-sm'
    : 'flex gap-1 text-sm',
)

const tabs = computed(() => props.options.map((opt) => {
  const disabled = props.disabled || opt.disabled === true
  const selected = opt.value === props.modelValue
  return {
    value: opt.value,
    label: opt.label,
    id: `tab-${uid}-${String(opt.value)}`,
    tabpanelId: `tabpanel-${uid}-${String(opt.value)}`,
    disabled,
    selected,
  }
}))

const lookup = computed(() => Object.fromEntries(
  tabs.value.map(t => [String(t.value), { id: t.id, tabpanelId: t.tabpanelId }]),
))

const onKeydown = (event: KeyboardEvent) => {
  const tablist = event.currentTarget as HTMLElement | null
  if (!tablist) return
  const currentFocus = document.activeElement as HTMLElement | null

  const nextKey = props.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  const prevKey = props.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

  switch (event.key) {
    case nextKey:
      event.preventDefault()
      moveFocus(tablist, currentFocus, nextItem)
      break
    case prevKey:
      event.preventDefault()
      moveFocus(tablist, currentFocus, previousItem)
      break
    case 'Home':
      event.preventDefault()
      moveFocus(tablist, null, nextItem)
      break
    case 'End':
      event.preventDefault()
      moveFocus(tablist, null, previousItem)
      break
  }
}

const onTabClick = async (value: T) => {
  if (props.modelValue === value) return
  const result = await props.onBeforeChange?.(value)
  if (result === false) return
  emit('update:modelValue', value)
}

provide(TABS_INJECT_KEY, {
  modelValue: toRef(() => props.modelValue) as Ref<unknown>,
  lookup,
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        :aria-label="ariaLabel"
        :aria-orientation="orientation"
        :class="tablistClass"
        @keydown="onKeydown"
      >
        <button
          v-for="tab in tabs"
          :id="tab.id"
          :key="String(tab.value)"
          type="button"
          role="tab"
          :aria-selected="tab.selected ? 'true' : 'false'"
          :aria-controls="tab.tabpanelId"
          :tabindex="tab.selected ? 0 : -1"
          :disabled="tab.disabled"
          class="px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
          :class="[
            radiusClass,
            tab.selected
              ? 'bg-brand text-white'
              : 'text-text-muted hover:bg-surface-alt hover:text-text',
          ]"
          @click="onTabClick(tab.value)"
        >
          <slot name="tab" :tab="tab">{{ tab.label }}</slot>
        </button>
      </div>
      <slot name="trailing" />
    </div>
    <slot />
  </div>
</template>
