<script setup lang="ts" generic="T">
import type { VNode } from 'vue'

export interface DescriptionItem<TItem = unknown> {
  /** 顯示的標籤 */
  label: string
  /** 對應 slot 名稱（沒給就用 label 當 fallback、傳資料給 default slot） */
  key?: string
  /** 跨幾欄（grid cols），預設 1 */
  span?: number
  /** 直接給字串值；若要自訂 render 用 slot */
  value?: string | number | null
  /** 額外 dd 樣式 */
  ddClass?: string
  /** 額外 dt 樣式 */
  dtClass?: string
  /** 是否隱藏（v-if） */
  hidden?: boolean
  /** 自訂資料載荷，會以 slot prop 傳出 */
  payload?: TItem
}

const props = withDefaults(defineProps<{
  /** 條目清單 */
  items: DescriptionItem<T>[]
  /** grid 欄數，預設 2 */
  cols?: 1 | 2 | 3 | 4
  /** dt 共用樣式 */
  dtClass?: string
  /** 文字大小 */
  size?: 'xs' | 'sm'
}>(), {
  cols: 2,
  dtClass: 'text-xs text-text-muted mb-1',
  size: 'sm'
})

const slots = defineSlots<{
  [name: string]: (props: { item: DescriptionItem<T> }) => VNode[]
}>()

const gridClass = computed(() => {
  const map: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }
  return `grid ${map[props.cols]} gap-4`
})

const textClass = computed(() => props.size === 'xs' ? 'text-xs' : 'text-sm')

function spanClass(span?: number) {
  if (!span || span <= 1) return ''
  if (span === 2) return 'col-span-2'
  if (span === 3) return 'col-span-3'
  if (span === 4) return 'col-span-4'
  return ''
}
</script>

<template>
  <dl :class="[gridClass, textClass]">
    <template v-for="it in items" :key="it.key ?? it.label">
      <div v-if="!it.hidden" :class="spanClass(it.span)">
        <dt :class="[dtClass, it.dtClass]">{{ it.label }}</dt>
        <dd :class="it.ddClass">
          <slot v-if="it.key && slots[it.key]" :name="it.key" :item="it" />
          <template v-else>{{ it.value ?? '—' }}</template>
        </dd>
      </div>
    </template>
  </dl>
</template>
