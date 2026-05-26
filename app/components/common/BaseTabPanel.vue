<script setup lang="ts">
import { computed, inject } from 'vue'
import { TABS_INJECT_KEY } from './BaseTabs.vue'

const props = withDefaults(defineProps<{
  value: string | number
  /** 是否在切換後保留 DOM（預設 true，符合 a11y 與保留輸入狀態的需求） */
  keepAlive?: boolean
  /**
   * 是否讓 panel 本身可被 Tab 鍵聚焦（設 `tabindex="0"`）。
   * 預設 false — 當 panel 內含任何可聚焦元素（button、link、input）時不該再設，
   * 避免多一個無意義的 Tab stop。僅在 panel 純內容（圖文、純文字）時才設 true。
   */
  focusable?: boolean
}>(), {
  keepAlive: true,
  focusable: false,
})

const context = inject(TABS_INJECT_KEY, null)

const isActive = computed(() => {
  if (!context) return true
  return context.modelValue.value === props.value
})

const meta = computed(() => {
  if (!context) return null
  return context.lookup.value[String(props.value)] ?? null
})

const shouldRender = computed(() => props.keepAlive || isActive.value)
</script>

<template>
  <div
    v-if="shouldRender"
    :id="meta?.tabpanelId"
    :aria-labelledby="meta?.id"
    :hidden="!isActive"
    :role="context ? 'tabpanel' : undefined"
    :tabindex="focusable ? 0 : undefined"
    :class="focusable ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40' : undefined"
  >
    <slot />
  </div>
</template>
