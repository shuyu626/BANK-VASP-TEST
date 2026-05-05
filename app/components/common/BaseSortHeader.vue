<script setup lang="ts" generic="K extends string">
import type { SortState } from '~/composables/useSortable'

const props = withDefaults(defineProps<{
  /** 此欄位對應的 sort key */
  sortKey: K
  /** useSortable() 回傳的 state */
  sort: SortState<K>
  /** 對齊：left（預設）/ right（數值欄常用） */
  align?: 'left' | 'right' | 'center'
  /** 額外 class，例如 px-4 py-3 等表格樣式 */
  thClass?: string
}>(), {
  align: 'left',
  thClass: 'px-4 py-3 font-medium'
})

const alignClass = computed(() => ({
  left: 'text-left',
  right: 'text-right',
  center: 'text-center'
}[props.align]))

const isActive = computed(() => props.sort.key.value === props.sortKey)
const arrow = computed(() => {
  if (!isActive.value) return ''
  return props.sort.dir.value === 'asc' ? '↑' : '↓'
})
</script>

<template>
  <th
    :class="[alignClass, thClass, 'cursor-pointer hover:text-text select-none']"
    :aria-sort="isActive ? (sort.dir.value === 'asc' ? 'ascending' : 'descending') : 'none'"
    @click="sort.toggle(sortKey)"
  >
    <slot />
    <span class="ml-1 inline-block w-2 text-text-muted">{{ arrow }}</span>
  </th>
</template>
