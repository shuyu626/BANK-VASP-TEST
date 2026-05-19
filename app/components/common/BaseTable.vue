<script setup lang="ts" generic="T extends object">
import { computed, ref, watch, useSlots } from 'vue'

export interface TableColumn {
  /** 對應 row 上的 key，亦作為 #cell-<key> slot 名稱 */
  key: string
  /** 表頭文字（支援 i18n） */
  label: string
  /** 對齊方式，預設 left */
  align?: 'left' | 'right' | 'center'
  /** 欄寬，e.g. '120px' / '20%'。CSS width，會直接寫進 style */
  width?: string
  /** 額外加在 <th> 的 class */
  headerClass?: string
  /** 額外加在 <td> 的 class */
  cellClass?: string
}

type RowClassValue = string | string[] | Record<string, boolean>
type RowKeyValue = string | number

const props = withDefaults(defineProps<{
  /** Declarative 模式：給 columns 自動渲染 thead；不給就走 <slot name="head"> 舊模式 */
  columns?: TableColumn[]
  /** 與 columns 配對的資料；給了會自動 render tbody，不給就走 default slot */
  items?: T[]
  /** row key 取得方式：欄位名稱 / 函式；都沒給時優先 row.id，再 fallback index */
  rowKey?: keyof T | ((row: T, index: number) => string | number)
  /** 內建分頁。需搭配 items 才有效 */
  paginated?: boolean
  /** 預設每頁筆數，預設 20 */
  defaultPageSize?: number
  /** 每頁筆數選項，預設 [10, 20, 50, 100] */
  pageSizeOptions?: number[]
  /** Pagination footer 上是否顯示「共 N 筆」（傳入 BasePagination）*/
  showTotal?: boolean

  // ─── 以下是舊 props，保留給沒走 declarative 的 caller ───
  /** 是否顯示空狀態（呼叫方判斷 items.length === 0）。declarative 模式下會自動推導 */
  empty?: boolean
  /** colspan，需與 thead 欄數對齊。declarative 模式下自動 = columns.length */
  colspan?: number
  /** 自訂 wrapper class，預設用 admin/trader 共用樣式 */
  panelClass?: string
  /** 空狀態文字；未傳則使用 i18n 預設值 */
  emptyText?: string
  /** 載入中：與 empty 同時 true → 文字覆寫；有資料時 → overlay spinner */
  loading?: boolean
  /** 錯誤訊息：有值則優先於 empty 顯示錯誤狀態（含 retry 按鈕） */
  errorMessage?: string | null
  /** tbody 是否套用 .num 等寬數字字級 */
  numeric?: boolean
  /** 包進 footer slot 時要不要顯示分隔線（預設有） */
  footerBordered?: boolean
  /** 首次 loading + 尚無資料時要顯示的 skeleton 列數；0 = 沿用「載入中…」文字 */
  skeletonRows?: number
  /** 表格區（含資料 / 空狀態 / 錯誤態）的最小高度，CSS height 字串，預設 '300px' */
  minHeight?: string
  /** <table> 額外 class，可用於套用主題樣式（e.g. bank-table） */
  tableClass?: string
  /** <table> 最小寬度，預設 640px */
  tableMinWidth?: string
  /** 每列自訂 class（declarative body） */
  rowClass?: RowClassValue | ((row: T, index: number) => RowClassValue)
  /** 可控展開列 keys（declarative + #row-expanded slot） */
  expandedKeys?: RowKeyValue[]
  /** 非受控展開列初始 keys */
  defaultExpandedKeys?: RowKeyValue[]
  /** 點擊資料列時是否切換展開（預設 false） */
  expandOnRowClick?: boolean
  /** 允許展開的列條件；未提供時預設皆可展開 */
  rowExpandable?: (row: T, index: number) => boolean
  /** 展開列 colspan，預設沿用欄數推導 */
  expandedColspan?: number
  /** 展開列 tr 額外 class */
  expandedRowClass?: string
}>(), {
  paginated: false,
  defaultPageSize: 20,
  pageSizeOptions: () => [10, 20, 50, 100],
  showTotal: true,
  panelClass: 'bg-surface border border-border rounded overflow-hidden',
  emptyText: '',
  loading: false,
  errorMessage: null,
  numeric: false,
  footerBordered: true,
  skeletonRows: 0,
  minHeight: '300px',
  tableClass: '',
  tableMinWidth: '640px',
  rowClass: undefined,
  expandedKeys: undefined,
  defaultExpandedKeys: () => [],
  expandOnRowClick: false,
  rowExpandable: undefined,
  expandedColspan: undefined,
  expandedRowClass: ''
})

const emit = defineEmits<{
  retry: []
  rowClick: [row: T, index: number]
  'update:expandedKeys': [keys: RowKeyValue[]]
  toggleExpand: [payload: { row: T; index: number; key: RowKeyValue; expanded: boolean }]
}>()

const slots = useSlots()
const attrs = useAttrs()
const { t } = useI18n()

// ─── Mode detection ───
const useColumnsHead = computed(() => Array.isArray(props.columns) && props.columns.length > 0)
const useItemsBody = computed(() => Array.isArray(props.items))
const hasExpandedSlot = computed(() => typeof slots['row-expanded'] === 'function')
const canUseExpandableRows = computed(() => useColumnsHead.value && useItemsBody.value && hasExpandedSlot.value)

// colspan 自動推導
const colspanResolved = computed(() => {
  if (typeof props.colspan === 'number') return props.colspan
  if (useColumnsHead.value) return props.columns!.length
  return 1
})
const expandedColspanResolved = computed(() => props.expandedColspan ?? colspanResolved.value)

// ─── Pagination state ───
const page = ref(1)
const pageSize = ref(props.defaultPageSize)
const total = computed(() => props.items?.length ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / Math.max(1, pageSize.value))))

watch([total, pageSize], () => {
  if (page.value > pageCount.value) page.value = pageCount.value
  if (page.value < 1) page.value = 1
})

const visibleItems = computed<T[]>(() => {
  if (!props.items) return []
  if (!props.paginated) return props.items
  const start = (page.value - 1) * pageSize.value
  return props.items.slice(start, start + pageSize.value)
})

// ─── Empty / loading / error state ───
const isEmpty = computed(() => {
  if (useItemsBody.value) return total.value === 0
  return props.empty ?? false
})

const finalEmpty = computed(() => props.emptyText || t('components.tableShell.defaultEmpty'))
const loadingText = computed(() => t('components.tableShell.loading'))
const errorTitle = computed(() => t('components.tableShell.errorTitle'))
const retryText = computed(() => t('components.tableShell.errorRetry'))
const hasError = computed(() => !!props.errorMessage)
const showSkeleton = computed(() =>
  props.loading && isEmpty.value && !hasError.value && props.skeletonRows > 0
)
const showOverlay = computed(() => props.loading && !isEmpty.value && !hasError.value)

const internalExpandedKeys = ref<RowKeyValue[]>([...props.defaultExpandedKeys])
const expandedKeySet = computed(() =>
  new Set<RowKeyValue>(props.expandedKeys ?? internalExpandedKeys.value)
)

// ─── Row helpers ───
function getRowKey(row: T, index: number): RowKeyValue {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  if (typeof props.rowKey === 'string') {
    const v = (row as Record<string, unknown>)[props.rowKey]
    if (typeof v === 'string' || typeof v === 'number') return v
  }
  if ('id' in row) {
    const v = row.id
    if (typeof v === 'string' || typeof v === 'number') return v
  }
  return index
}

function isRowExpandable(row: T, index: number): boolean {
  if (!canUseExpandableRows.value) return false
  if (typeof props.rowExpandable === 'function') return props.rowExpandable(row, index)
  return true
}

function isRowExpanded(row: T, index: number): boolean {
  if (!isRowExpandable(row, index)) return false
  return expandedKeySet.value.has(getRowKey(row, index))
}

function setExpandedKeys(keys: RowKeyValue[]) {
  if (props.expandedKeys === undefined) {
    internalExpandedKeys.value = keys
  }
  emit('update:expandedKeys', keys)
}

function toggleExpanded(row: T, index: number) {
  if (!isRowExpandable(row, index)) return
  const key = getRowKey(row, index)
  const next = new Set<RowKeyValue>(expandedKeySet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  const expanded = next.has(key)
  setExpandedKeys([...next])
  emit('toggleExpand', { row, index, key, expanded })
}

function getCellValue(row: T, col: TableColumn): unknown {
  return (row as Record<string, unknown>)[col.key]
}

function alignClass(a?: 'left' | 'right' | 'center'): string {
  if (a === 'right') return 'text-right'
  if (a === 'center') return 'text-center'
  return 'text-left'
}

function resolveRowClass(row: T, index: number): RowClassValue | undefined {
  if (typeof props.rowClass === 'function') return props.rowClass(row, index)
  return props.rowClass
}

function onDataRowClick(row: T, index: number) {
  if (props.expandOnRowClick) toggleExpanded(row, index)
  if (hasRowClickListener.value) emit('rowClick', row, index)
}

const hasRowClickListener = computed(() => 'onRowClick' in attrs)

// 暴露讓 caller 可以程式化重設分頁
defineExpose({
  page,
  pageSize,
  total,
  pageCount,
  resetPage: () => { page.value = 1 }
})
</script>

<template>
  <div :class="panelClass">
    <div class="relative overflow-x-auto" :style="{ minHeight: minHeight }">
      <table
        class="w-full text-sm"
        :class="tableClass"
        :style="tableMinWidth ? { minWidth: tableMinWidth } : undefined"
      >
        <thead>
          <!-- Declarative 表頭：從 columns 自動產生 -->
          <tr v-if="useColumnsHead" class="text-xs text-text-muted border-b border-border">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 font-medium"
              :class="[alignClass(col.align), col.headerClass]"
              :style="col.width ? { width: col.width } : undefined"
            >
              <slot :name="`head-${col.key}`" :column="col">{{ col.label }}</slot>
            </th>
          </tr>
          <!-- 舊模式：完整 <tr><th>...</th></tr> 由 caller 提供 -->
          <slot v-else name="head" />
        </thead>
        <tbody :class="{ num: numeric }">
          <tr v-if="hasError">
            <td
              :colspan="colspanResolved"
              class="px-4 py-10 text-center align-middle"
              :style="{ height: minHeight }"
            >
              <div class="flex flex-col items-center gap-2 text-text-muted">
                <Icon name="lucide:alert-triangle" size="20" class="text-danger" aria-hidden="true" />
                <div class="text-sm font-medium text-text">{{ errorTitle }}</div>
                <div class="text-xs">{{ errorMessage }}</div>
                <button
                  type="button"
                  class="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-surface-alt"
                  @click="emit('retry')"
                >
                  <Icon name="lucide:refresh-cw" size="12" aria-hidden="true" />
                  {{ retryText }}
                </button>
              </div>
            </td>
          </tr>
          <template v-else-if="showSkeleton">
            <tr v-for="i in skeletonRows" :key="`sk-${i}`" class="border-b border-border last:border-0">
              <td v-for="c in colspanResolved" :key="`sk-${i}-${c}`" class="px-4 py-3">
                <div class="h-3 rounded bg-surface-alt animate-pulse" :style="{ width: `${50 + ((i + c) * 7) % 40}%` }" />
              </td>
            </tr>
          </template>
          <tr v-else-if="isEmpty">
            <td
              :colspan="colspanResolved"
              class="px-4 py-10 text-center text-text-muted align-middle"
              :style="{ height: minHeight }"
            >
              {{ loading ? loadingText : finalEmpty }}
            </td>
          </tr>
          <!-- Declarative body：根據 columns 自動鋪 td；每欄支援 #cell-<key> slot -->
          <template v-else-if="useColumnsHead && useItemsBody">
            <template v-for="(row, idx) in visibleItems" :key="getRowKey(row, idx)">
              <tr
                class="border-b border-border last:border-0"
                :class="[
                  resolveRowClass(row, idx),
                  {
                    'cursor-pointer hover:bg-surface-alt': hasRowClickListener || (expandOnRowClick && isRowExpandable(row, idx))
                  }
                ]"
                @click="onDataRowClick(row, idx)"
              >
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="px-4 py-3"
                  :class="[alignClass(col.align), col.cellClass]"
                >
                  <slot
                    :name="`cell-${col.key}`"
                    :row="row"
                    :index="idx"
                    :value="getCellValue(row, col)"
                    :column="col"
                  >
                    {{ getCellValue(row, col) ?? '' }}
                  </slot>
                </td>
              </tr>
              <tr
                v-if="isRowExpanded(row, idx)"
                :class="expandedRowClass"
              >
                <td :colspan="expandedColspanResolved" class="px-4 py-3">
                  <slot
                    name="row-expanded"
                    :row="row"
                    :index="idx"
                    :key-value="getRowKey(row, idx)"
                    :toggle="() => toggleExpanded(row, idx)"
                  />
                </td>
              </tr>
            </template>
          </template>
          <!-- 舊模式：caller 自行寫 <tr><td>...</td></tr> -->
          <slot v-else />
        </tbody>
      </table>
      <!-- Overlay loading（已有資料時，刷新中顯示） -->
      <div
        v-if="showOverlay"
        class="absolute inset-0 bg-surface/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none"
      >
        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span class="inline-block w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
          {{ loadingText }}
        </div>
      </div>
    </div>

    <!-- 內建分頁 footer（declarative + paginated）-->
    <div
      v-if="paginated && useItemsBody && total > 0"
      :class="footerBordered ? 'border-t border-border' : ''"
    >
      <BasePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        :page-size-options="pageSizeOptions"
        :show-total="showTotal"
        @update:page="(v) => (page = v)"
        @update:pageSize="(v) => { pageSize = v; page = 1 }"
      />
    </div>
    <!-- 自訂 footer slot（舊 caller 用 usePagination + BasePagination 自塞）-->
    <div v-else-if="slots.footer" :class="footerBordered ? 'border-t border-border' : ''">
      <slot name="footer" />
    </div>
  </div>
</template>
