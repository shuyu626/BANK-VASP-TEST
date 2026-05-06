// 統一列表 / 詳情頁的 fetch 樣板：data、loading、error、refetch 一站式。
// 與 <BaseTable> 的三態（loading / error / empty）整合。
//
// 用法：
//   const { data, loading, error, refetch } = useApiResource<{ users: User[] }>(
//     '/api/admin/users',
//     {
//       query: () => ({ kycStatus: kycFilter.value || undefined }),
//       watchSources: [kycFilter, search]
//     }
//   )
//
// 預設 SSR 會自動帶 cookie，errorMessage 已 humanize 為 statusMessage。

import type { Ref, WatchSource } from 'vue'

interface UseApiResourceOptions<T> {
  /** 動態 query；每次 refetch 都會重新呼叫 */
  query?: () => Record<string, string | number | boolean | undefined>
  /** 依賴 ref/computed/getter 改動時自動 refetch */
  watchSources?: WatchSource[]
  /** 自訂 fetch 完成後的 transform；error 時不會跑 */
  transform?: (raw: T) => T
  /** 自訂初始值（預設 null） */
  initial?: T | null
}

export interface UseApiResource<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  refetch: () => Promise<void>
}

export function useApiResource<T>(
  url: string | (() => string),
  options: UseApiResourceOptions<T> = {}
): UseApiResource<T> {
  const data = ref(options.initial ?? null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refetch() {
    loading.value = true
    error.value = null
    try {
      const u = typeof url === 'function' ? url() : url
      const q = options.query?.()
      const cleanQuery: Record<string, string | number | boolean> = {}
      if (q) {
        for (const [k, v] of Object.entries(q)) {
          if (v !== undefined && v !== null && v !== '') cleanQuery[k] = v
        }
      }
      // Cast around Nitro's typed-fetch route inference (引入 union URL 會超出 TS 比較深度)
      const fetchAny = $fetch as <R>(url: string, opts?: { query?: Record<string, unknown>; headers?: Record<string, string> }) => Promise<R>
      const res = await fetchAny<T>(u, {
        query: cleanQuery,
        headers: ssrCookieHeaders()
      })
      data.value = options.transform ? options.transform(res) : res
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  // 注意：本 composable 不自動發起首次請求；呼叫端需 `await refetch()`，
  // 這樣 SSR 階段也會等資料；watchSources 之後會自動 refetch。
  if (options.watchSources && options.watchSources.length > 0) {
    watch(options.watchSources, () => { refetch() }, { flush: 'post' })
  }

  return { data, loading, error, refetch }
}

/** 將 unknown error 抽成可顯示字串：優先 statusMessage、其次 message。 */
export function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { statusMessage?: string; message?: string; data?: { message?: string } }
    return e.statusMessage ?? e.data?.message ?? e.message ?? 'UNKNOWN_ERROR'
  }
  if (typeof err === 'string') return err
  return 'UNKNOWN_ERROR'
}
