<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 是否顯示空狀態（呼叫方判斷 items.length === 0） */
  empty?: boolean
  /** colspan，需與 thead 欄數對齊 */
  colspan: number
  /** 自訂 wrapper class，預設用 admin/trader 共用樣式 */
  panelClass?: string
  /** 空狀態文字；未傳則使用 i18n 預設值 */
  emptyText?: string
  /**
   * 載入中：
   * - 與 empty 同時 true 時，空狀態文字會顯示「載入中…」覆寫 emptyText
   * - 與 empty 為 false（已有資料）時，table 上方覆蓋 spinner overlay
   */
  loading?: boolean
  /** 錯誤訊息：若有值則優先於 empty 顯示錯誤狀態（含可選的重試按鈕） */
  errorMessage?: string | null
  /** 表格內容是否使用等寬數字字級（搭配 .num utility class） */
  numeric?: boolean
  /** 包進 footer slot 時要不要顯示分隔線（預設有） */
  footerBordered?: boolean
  /** 首次 loading + 尚無資料時要顯示的 skeleton 列數；0 = 沿用「載入中…」文字（預設 0） */
  skeletonRows?: number
}>(), {
  empty: false,
  panelClass: 'bg-surface border border-border rounded overflow-hidden',
  emptyText: '',
  loading: false,
  errorMessage: null,
  numeric: false,
  footerBordered: true,
  skeletonRows: 0
})

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()
const finalEmpty = computed(() => props.emptyText || t('components.tableShell.defaultEmpty'))
const loadingText = computed(() => t('components.tableShell.loading'))
const errorTitle = computed(() => t('components.tableShell.errorTitle'))
const retryText = computed(() => t('components.tableShell.errorRetry'))
const slots = useSlots()
const hasError = computed(() => !!props.errorMessage)
const showSkeleton = computed(() =>
  props.loading && props.empty && !hasError.value && props.skeletonRows > 0
)
// 錯誤態優先；其次 empty；最後正常列表
const showOverlay = computed(() => props.loading && !props.empty && !hasError.value)
</script>

<template>
  <div :class="panelClass">
    <div class="relative overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead>
          <slot name="head" />
        </thead>
        <tbody :class="{ num: numeric }">
          <tr v-if="hasError">
            <td :colspan="colspan" class="px-4 py-10 text-center">
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
              <td v-for="c in colspan" :key="`sk-${i}-${c}`" class="px-4 py-3">
                <div class="h-3 rounded bg-surface-alt animate-pulse" :style="{ width: `${50 + ((i + c) * 7) % 40}%` }" />
              </td>
            </tr>
          </template>
          <tr v-else-if="empty">
            <td :colspan="colspan" class="px-4 py-10 text-center text-text-muted">
              {{ loading ? loadingText : finalEmpty }}
            </td>
          </tr>
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
    <div v-if="slots.footer" :class="footerBordered ? 'border-t border-border' : ''">
      <slot name="footer" />
    </div>
  </div>
</template>
