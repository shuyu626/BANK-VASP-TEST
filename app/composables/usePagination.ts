// 通用分頁 state，搭配 <BasePagination> 使用。
// 給定 source（reactive items），回傳目前頁的切片 + bindings 給 BasePagination。

interface UsePaginationOptions<T> {
  /** 資料來源 ref/computed，pagination 會自動跟著重新計算 */
  source: () => T[]
  /** 預設每頁筆數 */
  defaultPageSize?: number
  /** 可選的每頁筆數選項；不傳代表不顯示 page-size selector */
  pageSizeOptions?: number[]
}

export interface PaginationBindings {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  'onUpdate:page': (n: number) => void
  'onUpdate:pageSize': (n: number) => void
}

export function usePagination<T>(opts: UsePaginationOptions<T>) {
  const page = ref(1)
  const pageSize = ref(opts.defaultPageSize ?? 20)

  const sourceItems = computed(() => opts.source())
  const total = computed(() => sourceItems.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  // source / pageSize 變化時，clamp 當前頁
  watch([total, pageSize], () => {
    if (page.value > pageCount.value) page.value = pageCount.value
    if (page.value < 1) page.value = 1
  })

  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return sourceItems.value.slice(start, start + pageSize.value)
  })

  function setPage(n: number) {
    if (n < 1) n = 1
    if (n > pageCount.value) n = pageCount.value
    page.value = n
  }

  function setPageSize(n: number) {
    if (n <= 0) return
    pageSize.value = n
    page.value = 1
  }

  function reset() {
    page.value = 1
  }

  // 給 v-bind 用的 bindings 物件，呼叫方一次性 spread 到 <BasePagination v-bind="bindings" />
  const bindings = computed<PaginationBindings>(() => ({
    page: page.value,
    pageSize: pageSize.value,
    total: total.value,
    pageSizeOptions: opts.pageSizeOptions,
    'onUpdate:page': setPage,
    'onUpdate:pageSize': setPageSize
  }))

  return {
    page,
    pageSize,
    total,
    pageCount,
    paged,
    setPage,
    setPageSize,
    reset,
    bindings
  }
}
