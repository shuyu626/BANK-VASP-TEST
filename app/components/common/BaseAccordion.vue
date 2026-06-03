<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

/** BaseAccordion 透過 provide 傳給子層 BaseAccordionPanel 的 context */
export interface BaseAccordionContext {
  /** 目前展開的 value 集合（已 normalize 成陣列，單選時最多一個） */
  activeValues: ComputedRef<readonly (string | number)[]>
  /** 切換某個 panel 的展開狀態，由父層依 multiple 決定行為 */
  toggle: (value: string | number) => void
  /** 父層唯一 id，用於串接 summary / content 的 aria 關聯 */
  uid: string
}

export const ACCORDION_INJECT_KEY: InjectionKey<BaseAccordionContext> = Symbol('BaseAccordion')
</script>

<script setup lang="ts" generic="T extends string | number">
import { computed, provide, useId } from 'vue'

const props = withDefaults(defineProps<{
  /** 是否允許同時展開多個 panel；true 時 v-model 為陣列 */
  multiple?: boolean
}>(), {
  multiple: false,
})

/**
 * v-model：
 * - `multiple: false` → 單一值（未展開時為 `null`）
 * - `multiple: true`  → 值陣列
 * 未綁定 v-model 時退化為非受控（內部自行記錄展開狀態）。
 */
const model = defineModel<T | T[] | null>({ default: null })

const uid = useId()

// 把 v-model 正規化成「展開值陣列」，讓子層一律用 includes() 判斷是否展開，
const activeValues = computed<readonly T[]>(() => {
  const value = model.value
  // null / undefined（未綁定或全部收合）→ 視為空集合
  if (value === null || value === undefined) return []
  // 多選為陣列、單選為單一值，統一包成陣列
  return Array.isArray(value) ? value : [value]
})

// 切換某個 panel 的展開狀態，依 multiple 決定是「累加/移除」還是「單選互斥」
const toggle = (value: T) => {
  const current = activeValues.value
  const isOpen = current.includes(value)

  if (props.multiple) {
    // 多選：已開 → 從陣列移除；未開 → 附加到陣列（其餘 panel 維持不變）
    model.value = isOpen
      ? current.filter(item => item !== value)
      : [...current, value]
    return
  }

  // 單選：已開 → 收合成 null；未開 → 只留這一個值（自動關掉其他 panel）
  model.value = isOpen ? null : value
}

provide(ACCORDION_INJECT_KEY, {
  // T 受限於 string | number，對 context 而言以寬型別暴露即可
  activeValues: activeValues as ComputedRef<readonly (string | number)[]>,
  toggle: toggle as (value: string | number) => void,
  uid,
})
</script>

<template>
  <div class="border-y border-border divide-y divide-border">
    <slot />
  </div>
</template>
