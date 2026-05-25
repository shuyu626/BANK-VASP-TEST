<script setup lang="ts">
/**
 * BasePagination — 通用分頁元件
 *
 * Layout：
 *   左側：共 N 筆 / 顯示第 X–Y 筆 + 每頁筆數選擇器（可選）
 *   右側：首頁 ⟨ 1 … 5 6 7 … 99 ⟩ 尾頁
 *
 * 與父層透過 v-model:page / v-model:perPage 雙向綁定。
 * 元件內部對超界 page 會自我 clamp，避免「資料量驟減後父層忘了 reset page」造成顯示矛盾。
 * 頁碼按鈕序列的計算邏輯抽到 `~/utils/pagination` 的純函式以便單元測試。
 */
import { computePageItems, type PageItem } from '~/utils/pagination'

// ─── Props / Emit ────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  /** 當前頁碼（1-based） */
  page: number
  /** 每頁筆數 */
  perPage: number
  /** 總筆數 */
  total: number
  /** 每頁筆數選項；不傳則不顯示 selector */
  perPageOptions?: number[]
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
  'update:perPage': [value: number]
}>()

const { t } = useI18n()

// ─── Derived state ───────────────────────────────────────────────────────────

// perPage <= 0 時保底用 1，避免除以 0 → Infinity → range 炸出超大陣列。
const safeperPage = computed(() => Math.max(1, props.perPage))
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / safeperPage.value)))
// 父層傳入的 page 可能超界（例如資料量驟減後沒重置），元件內統一收斂到合法區間，
// 避免 range 顯示與 isFirst / isLast 出現矛盾。
const safePage = computed(() => Math.min(Math.max(1, props.page), pageCount.value))
const isFirst = computed(() => safePage.value <= 1)
const isLast = computed(() => safePage.value >= pageCount.value)

const pageItems = computed(() =>
  computePageItems({
    page: safePage.value,
    count: pageCount.value,
    boundaryCount: props.boundaryCount,
    siblingCount: props.siblingCount,
  }),
)

// ─── Actions ─────────────────────────────────────────────────────────────────

// 統一的跳頁入口：disabled、無變化、超界三種情境直接 no-op，
// 父層不用再自己做 guard。
function go(n: number) {
  if (props.disabled) return
  if (n === safePage.value) return
  if (n < 1 || n > pageCount.value) return
  emit('update:page', n)
}

function changeSize(e: Event) {
  if (props.disabled) return
  const v = Number((e.target as HTMLSelectElement).value)
  if (!Number.isFinite(v) || v <= 0) return
  // 切到更大的 perPage 時原本的 page 可能直接超界（例：第 10 頁 → 只剩 1 頁），
  // 同步把 page 拉回 1，避免父層忘記重置造成顯示卡死。
  const nextCount = Math.max(1, Math.ceil(props.total / v))
  if (safePage.value > nextCount) emit('update:page', 1)
  emit('update:perPage', v)
}

// ─── View state（顯示用） ─────────────────────────────────────────────────────

// 「第 X–Y 筆，共 N 筆」中的 X / Y；最後一頁不滿一整頁時，rangeEnd 會被 total clamp。
const rangeStart = computed(() => Math.min(props.total, (safePage.value - 1) * safeperPage.value + 1))
const rangeEnd = computed(() => Math.min(props.total, safePage.value * safeperPage.value))

function pageAriaLabel(p: number, isCurrent: boolean) {
  return isCurrent
    ? t('components.pagination.aria.current', { page: p })
    : t('components.pagination.aria.goto', { page: p })
}

// pageItems 內每個 item 取穩定 key，避免換頁時 ellipsis 出現／消失造成 DOM 配對錯誤
function itemKey(item: PageItem): string {
  return item.type === 'page' ? `p-${item.page}` : item.type
}

// 沒有任何區塊要顯示時整個容器不渲染，避免 footer 出現空白帶／殘留邊框
const hasLeftContent = computed(
  () => props.showTotal || (!!props.perPageOptions && props.perPageOptions.length > 1),
)
const hasRightContent = computed(() => pageCount.value > 1)
const shouldRender = computed(() => hasLeftContent.value || hasRightContent.value)

// ─── Styling tokens ──────────────────────────────────────────────────────────

// select 的 focus ring 與 BaseButton 對齊（BaseButton 已內建 focus ring，無需手動掛）。
const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40'
</script>

<template>
  <div v-if="shouldRender" class="flex items-center justify-between gap-4 flex-wrap text-xs px-4 py-3">
    <!-- 給輔助科技讀回當前頁，鍵盤使用者跳頁後也能聽到回饋 -->
    <span class="sr-only" aria-live="polite">
      {{ t('components.pagination.aria.current', { page: safePage }) }}
    </span>

    <!-- Left: total + range + page-size selector -->
    <div class="flex items-center gap-3 text-text-muted">
      <span v-if="showTotal && total > 0">
        {{ t('components.pagination.range', { start: rangeStart, end: rangeEnd, total }) }}
      </span>
      <span v-else-if="showTotal">
        {{ t('components.pagination.totalEmpty') }}
      </span>
      <select
        v-if="perPageOptions && perPageOptions.length > 1"
        :value="safeperPage"
        :disabled="disabled"
        :aria-label="t('components.pagination.aria.perPage')"
        class="px-2 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        :class="focusRingClass"
        @change="changeSize"
      >
        <option v-for="opt in perPageOptions" :key="opt" :value="opt">
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
          <BaseButton
            variant="secondary"
            size="xs"
            square
            :disabled="disabled || isFirst"
            :aria-label="t('components.pagination.aria.first')"
            @click="go(1)"
          >
            <Icon name="lucide:chevrons-left" size="14" aria-hidden="true" />
          </BaseButton>
        </li>
        <li>
          <BaseButton
            variant="secondary"
            size="xs"
            square
            :disabled="disabled || isFirst"
            :aria-label="t('components.pagination.aria.prev')"
            @click="go(safePage - 1)"
          >
            <Icon name="lucide:chevron-left" size="14" aria-hidden="true" />
          </BaseButton>
        </li>
        <li v-for="item in pageItems" :key="itemKey(item)">
          <span
            v-if="item.type !== 'page'"
            class="px-2 text-text-muted select-none"
            aria-hidden="true"
          >…</span>
          <BaseButton
            v-else
            :variant="item.selected ? 'primary' : 'secondary'"
            size="xs"
            square
            :disabled="disabled"
            :aria-current="item.selected ? 'page' : undefined"
            :aria-label="pageAriaLabel(item.page, item.selected)"
            @click="go(item.page)"
          >
            {{ item.page }}
          </BaseButton>
        </li>
        <li>
          <BaseButton
            variant="secondary"
            size="xs"
            square
            :disabled="disabled || isLast"
            :aria-label="t('components.pagination.aria.next')"
            @click="go(safePage + 1)"
          >
            <Icon name="lucide:chevron-right" size="14" aria-hidden="true" />
          </BaseButton>
        </li>
        <li v-if="showLastButton">
          <BaseButton
            variant="secondary"
            size="xs"
            square
            :disabled="disabled || isLast"
            :aria-label="t('components.pagination.aria.last')"
            @click="go(pageCount)"
          >
            <Icon name="lucide:chevrons-right" size="14" aria-hidden="true" />
          </BaseButton>
        </li>
      </ul>
    </nav>
  </div>
</template>
