// Bank 端列表 / 詳情頁專用 fetch wrapper：包裝 useFetch + 自動 humanize error。
// 與 admin 端的 useApiResource 互補：bank pages 多走 SSR useFetch，需要的多半只是
// 「拿 data + 顯示錯誤訊息 + refresh」三件事，不需要 watchSources auto refetch
// （要的話可以照 useFetch 原生 query: computed(...) 寫法即可）。
//
// 用法：
//   const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>(
//     '/api/bank/ctr'
//   )
//
//   // BasePageError + 列表三態整合：
//   <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
//   <BaseTable v-else :error-message="errorMessage" @retry="refresh" ... />

import type { Ref, ComputedRef } from 'vue'
import { extractErrorMessage } from './useApiResource'

interface UseBankResourceOptions {
  /** 與 useFetch 同名 query 參數（可為 plain / ref / computed） */
  query?: unknown
  /** 是否在 SSR 階段 fetch，預設 true（與 useFetch 一致） */
  server?: boolean
}

export interface UseBankResource<T> {
  data: Ref<T | null>
  error: Ref<unknown>
  /** humanized error message — null 表示沒錯誤；可直接餵給 BasePageError / BaseTable */
  errorMessage: ComputedRef<string | null>
  pending: Ref<boolean>
  refresh: () => Promise<void>
}

export async function useBankResource<T>(
  url: string | (() => string),
  options: UseBankResourceOptions = {}
): Promise<UseBankResource<T>> {
  // Cast around Nitro's typed-route union（同 useApiResource 的處理）
  const fetchAny = useFetch as unknown as <R>(
    u: string | (() => string),
    o?: UseBankResourceOptions
  ) => Promise<{
    data: Ref<R | null>
    error: Ref<unknown>
    refresh: () => Promise<void>
    pending: Ref<boolean>
  }>

  const { data, error, refresh, pending } = await fetchAny<T>(url, options)
  const errorMessage = computed(() => error.value ? extractErrorMessage(error.value) : null)
  return { data, error, errorMessage, refresh, pending }
}
