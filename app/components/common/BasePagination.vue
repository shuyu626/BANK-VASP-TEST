<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 當前頁碼（1-based） */
  page: number
  /** 每頁筆數 */
  pageSize: number
  /** 總筆數 */
  total: number
  /** 每頁筆數選項；不傳則不顯示 selector */
  pageSizeOptions?: number[]
  /** 顯示頁碼按鈕的最大數量（包含省略號），預設 7 */
  maxButtons?: number
  /** 是否顯示「共 N 筆」 */
  showTotal?: boolean
  /** 容器額外 class */
  class?: string
}>(), {
  maxButtons: 7,
  showTotal: true
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const { t } = useI18n()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const isFirst = computed(() => props.page <= 1)
const isLast = computed(() => props.page >= pageCount.value)

// 計算要顯示的頁碼（含省略號 -1）
const pages = computed<(number | -1)[]>(() => {
  const max = props.maxButtons
  const total = pageCount.value
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const cur = props.page
  const sideCount = Math.floor((max - 3) / 2) // 預留首/尾/省略號
  const start = Math.max(2, cur - sideCount)
  const end = Math.min(total - 1, cur + sideCount)
  const list: (number | -1)[] = [1]
  if (start > 2) list.push(-1)
  for (let i = start; i <= end; i++) list.push(i)
  if (end < total - 1) list.push(-1)
  list.push(total)
  return list
})

function go(n: number) {
  if (n === props.page) return
  if (n < 1 || n > pageCount.value) return
  emit('update:page', n)
}

function changeSize(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  if (Number.isFinite(v) && v > 0) emit('update:pageSize', v)
}

const rangeStart = computed(() => Math.min(props.total, (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.total, props.page * props.pageSize))
</script>

<template>
  <div class="flex items-center justify-between gap-4 flex-wrap text-xs px-4 py-3" :class="props.class">
    <!-- Left: total + range -->
    <div class="flex items-center gap-3 text-text-muted">
      <span v-if="showTotal && total > 0">
        {{ t('components.pagination.range', { start: rangeStart, end: rangeEnd, total }) }}
      </span>
      <span v-else-if="showTotal">
        {{ t('components.pagination.totalEmpty') }}
      </span>
      <select
        v-if="pageSizeOptions && pageSizeOptions.length > 1"
        :value="pageSize"
        class="px-2 py-1 rounded bg-surface border border-border text-xs"
        @change="changeSize"
      >
        <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
          {{ t('components.pagination.perPage', { count: opt }) }}
        </option>
      </select>
    </div>

    <!-- Right: page buttons -->
    <nav v-if="pageCount > 1" class="flex items-center gap-1" aria-label="pagination">
      <button
        type="button"
        class="px-2 py-1 border border-border rounded hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="isFirst"
        @click="go(page - 1)"
      >
        {{ t('components.pagination.prev') }}
      </button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === -1" class="px-2 text-text-muted select-none">…</span>
        <button
          v-else
          type="button"
          class="min-w-7 px-2 py-1 rounded transition"
          :class="p === page ? 'bg-brand text-white' : 'border border-border text-text-muted hover:bg-surface-alt hover:text-text'"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="px-2 py-1 border border-border rounded hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="isLast"
        @click="go(page + 1)"
      >
        {{ t('components.pagination.next') }}
      </button>
    </nav>
  </div>
</template>
