<script setup lang="ts" generic="T extends string | number">
import { computed, inject, useId } from 'vue'
import { ACCORDION_INJECT_KEY } from './BaseAccordion.vue'

const props = withDefaults(defineProps<{
  /** 對應父層 BaseAccordion v-model 的識別值；搭配父層時必填 */
  value?: T
  /** summary 標題文字（也可改用 #summary slot 自訂內容） */
  summary?: string
  /** 停用此 panel，無法展開 / 收合 */
  disabled?: boolean
  /** summary 外層 heading 階層，預設 h3（WAI-ARIA accordion 建議用 heading 包裹按鈕） */
  level?: 2 | 3 | 4 | 5 | 6
}>(), {
  value: undefined,
  summary: undefined,
  disabled: false,
  level: 3,
})

/** 獨立使用（無父層 BaseAccordion）時的受控開關；放在群組內則不使用此值 */
const model = defineModel<boolean>({ default: false })

// 嘗試取得父層 BaseAccordion 提供的 context；獨立使用時為 null
const context = inject(ACCORDION_INJECT_KEY, null)

// 用於 summary / content 的 aria 關聯 id。
// 有 value 就以 value 當識別，否則退回元件自身的 useId()，確保獨立使用也唯一。
const uid = useId()
const panelKey = computed(() => String(props.value ?? uid))
const headerId = computed(() => `${context?.uid ?? uid}-acc-header-${panelKey.value}`)
const contentId = computed(() => `${context?.uid ?? uid}-acc-content-${panelKey.value}`)

// 判斷此 panel 的開合狀態由「父層集中管理」還是「自身 v-model」決定：
// 需同時有父層 context 且有指定 value，缺一就退化為獨立模式。
const usingContext = computed(() => context !== null && props.value !== undefined)

// 是否展開：群組模式看父層 activeValues 是否含此 value；獨立模式看自身 model。
const isActive = computed(() => {
  // 群組模式：檢查自己的 value 是否在父層目前啟用清單中
  if (usingContext.value) {
    return context!.activeValues.value.includes(props.value!)
  }
  // 獨立模式：直接看自身 v-model
  return model.value
})

// 動態 heading 標籤（h2~h6），用 <component :is> 渲染以符合 a11y 結構
const headingTag = computed(() => `h${props.level}` as const)

// 點擊 summary 切換開合：群組模式委派父層 toggle（由父層決定單/多選互斥），
// 獨立模式則翻轉自身 model；disabled 時不做任何事。
const onSummaryClick = () => {
  if (props.disabled) return
  if (usingContext.value) {
    context!.toggle(props.value!)
    return
  }
  model.value = !model.value
}
</script>

<template>
  <div class="base-accordion-panel">
    <component :is="headingTag" class="m-0">
      <button
        :id="headerId"
        type="button"
        class="flex w-full items-center gap-3 px-4 py-4 text-left text-base font-medium text-text transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        :aria-expanded="isActive"
        :aria-controls="contentId"
        :disabled="disabled"
        @click="onSummaryClick"
      >
        <span class="grow">
          <slot name="summary" :active="isActive">{{ summary }}</slot>
        </span>
        <Icon
          name="lucide:chevron-down"
          size="20"
          class="shrink-0 text-text-muted transition-transform duration-300 motion-reduce:transition-none"
          :class="{ 'rotate-180': isActive }"
          aria-hidden="true"
        />
      </button>
    </component>

    <!--
      折疊動畫：grid-template-rows 0fr ⇄ 1fr（純 CSS，無 JS 量測、interruption-safe）。
      收合時以 inert 一併移出 tab order 與 a11y tree。
    -->
    <div
      :id="contentId"
      role="region"
      :aria-labelledby="headerId"
      :inert="!isActive"
      class="grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none"
      :class="isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div class="px-4 py-4 text-sm text-text-muted">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
