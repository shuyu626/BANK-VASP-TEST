<script setup lang="ts">
import { computePageItems } from '~/utils/pagination'

const props = withDefaults(defineProps<{
  /** 當前頁碼（1-based） */
  page: number
  /** 每頁筆數 */
  pageSize: number
  /** 總筆數 */
  total: number
  /** 每頁筆數選項；不傳則不顯示 selector */
  pageSizeOptions?: number[]
  /** 頭尾固定顯示的頁數，預設 1 */
  boundaryCount?: number
  /** 當前頁兩側顯示的頁數，預設 1 */
  siblingCount?: number
  /** 是否顯示「共 N 筆」 */
  showTotal?: boolean
  /** 是否顯示首頁按鈕 */
  showFirstButton?: boolean
  /** 是否顯示尾頁按鈕 */
  showLastButton?: boolean
  /** 操作中／載入中時禁用整個分頁 */
  disabled?: boolean
}>(), {
  boundaryCount: 1,
  siblingCount: 1,
  showTotal: true,
  showFirstButton: false,
  showLastButton: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const { t } = useI18n()

// pageSize <= 0 時保底用 1，避免除以 0 → Infinity → range 炸出超大陣列。
const safePageSize = computed(() => Math.max(1, props.pageSize))
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / safePageSize.value)))
const isFirst = computed(() => props.page <= 1)
const isLast = computed(() => props.page >= pageCount.value)

const pageItems = computed(() =>
  computePageItems({
    page: props.page,
    count: pageCount.value,
    boundaryCount: props.boundaryCount,
    siblingCount: props.siblingCount,
  }),
)

function go(n: number) {
  if (props.disabled) return
  if (n === props.page) return
  if (n < 1 || n > pageCount.value) return
  emit('update:page', n)
}

function changeSize(e: Event) {
  if (props.disabled) return
  const v = Number((e.target as HTMLSelectElement).value)
  if (Number.isFinite(v) && v > 0) emit('update:pageSize', v)
}

const rangeStart = computed(() => Math.min(props.total, (props.page - 1) * safePageSize.value + 1))
const rangeEnd = computed(() => Math.min(props.total, props.page * safePageSize.value))

function pageAriaLabel(p: number, isCurrent: boolean) {
  return isCurrent
    ? t('components.pagination.aria.current', { page: p })
    : t('components.pagination.aria.goto', { page: p })
}

// 沒有任何區塊要顯示時整個容器不渲染，避免 footer 出現空白帶／殘留邊框
const hasLeftContent = computed(
  () => props.showTotal || (!!props.pageSizeOptions && props.pageSizeOptions.length > 1),
)
const hasRightContent = computed(() => pageCount.value > 1)
const shouldRender = computed(() => hasLeftContent.value || hasRightContent.value)

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-bg'
const navButtonClass = `inline-flex items-center justify-center min-w-7 h-7 px-2 border border-border rounded hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition ${focusRingClass}`
</script>

<template>
  <div v-if="shouldRender" class="flex items-center justify-between gap-4 flex-wrap text-xs px-4 py-3">
    <!-- Left: total + range + page-size selector -->
    <div class="flex items-center gap-3 text-text-muted">
      <span v-if="showTotal && total > 0">
        {{ t('components.pagination.range', { start: rangeStart, end: rangeEnd, total }) }}
      </span>
      <span v-else-if="showTotal">
        {{ t('components.pagination.totalEmpty') }}
      </span>
      <select
        v-if="pageSizeOptions && pageSizeOptions.length > 1"
        :value="safePageSize"
        :disabled="disabled"
        :aria-label="t('components.pagination.aria.pageSize')"
        class="px-2 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        :class="focusRingClass"
        @change="changeSize"
      >
        <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
          {{ t('components.pagination.perPage', { count: opt }) }}
        </option>
      </select>
    </div>

    <!-- Right: page buttons -->
    <nav
      v-if="pageCount > 1"
      :aria-label="t('components.pagination.aria.nav')"
    >
      <ul class="flex items-center gap-1 list-none p-0 m-0">
        <li v-if="showFirstButton">
          <button
            type="button"
            :class="navButtonClass"
            :disabled="disabled || isFirst"
            :aria-label="t('components.pagination.aria.first')"
            @click="go(1)"
          >
            <Icon name="lucide:chevrons-left" size="14" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            :class="navButtonClass"
            :disabled="disabled || isFirst"
            :aria-label="t('components.pagination.aria.prev')"
            @click="go(page - 1)"
          >
            <Icon name="lucide:chevron-left" size="14" aria-hidden="true" />
          </button>
        </li>
        <li v-for="(item, i) in pageItems" :key="i">
          <span
            v-if="item.type === 'ellipsis'"
            class="px-2 text-text-muted select-none"
            aria-hidden="true"
          >…</span>
          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
            :class="[
              item.page === page ? 'bg-brand text-white' : 'border border-border text-text-muted hover:bg-surface-alt hover:text-text',
              focusRingClass,
            ]"
            :aria-current="item.page === page ? 'page' : undefined"
            :aria-label="pageAriaLabel(item.page, item.page === page)"
            :disabled="disabled"
            @click="go(item.page)"
          >
            {{ item.page }}
          </button>
        </li>
        <li>
          <button
            type="button"
            :class="navButtonClass"
            :disabled="disabled || isLast"
            :aria-label="t('components.pagination.aria.next')"
            @click="go(page + 1)"
          >
            <Icon name="lucide:chevron-right" size="14" aria-hidden="true" />
          </button>
        </li>
        <li v-if="showLastButton">
          <button
            type="button"
            :class="navButtonClass"
            :disabled="disabled || isLast"
            :aria-label="t('components.pagination.aria.last')"
            @click="go(pageCount)"
          >
            <Icon name="lucide:chevrons-right" size="14" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
