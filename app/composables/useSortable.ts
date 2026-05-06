// 通用排序 state，搭配 <BaseSortHeader> 使用。
// K 為可排序欄位的 key 聯合型別（呼叫方自訂）。

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  /** 當前排序 key；null 代表無排序 */
  key: Ref<K | null>
  /** 當前排序方向 */
  dir: Ref<SortDir>
  /** 點擊欄位 header：相同 key 切換方向，不同 key 切到該 key（dir 採 defaultDir 或既有方向） */
  toggle: (k: K) => void
  /** 強制設定 */
  set: (k: K | null, dir?: SortDir) => void
  /**
   * 對任意 array 套用排序的 helper。
   * accessor 從 row 取得排序值（number / string / Date / null）。
   * 已 immutable 排序，回傳新陣列。
   */
  sortBy: <T>(items: T[], accessor: (row: T, key: K) => SortableValue) => T[]
}

export type SortableValue = string | number | Date | null | undefined

interface UseSortableOptions<K extends string> {
  /** 預設排序 key，可為 null（初始無排序） */
  defaultKey?: K | null
  /** 預設方向 */
  defaultDir?: SortDir
  /** 切換到新 key 時使用的初始方向 */
  initialDirOnSwitch?: SortDir
}

export function useSortable<K extends string>(opts: UseSortableOptions<K> = {}): SortState<K> {
  const key = ref<K | null>(opts.defaultKey ?? null) as Ref<K | null>
  const dir = ref<SortDir>(opts.defaultDir ?? 'desc')
  const initialDirOnSwitch = opts.initialDirOnSwitch ?? 'desc'

  function toggle(k: K) {
    if (key.value === k) {
      dir.value = dir.value === 'asc' ? 'desc' : 'asc'
    } else {
      key.value = k
      dir.value = initialDirOnSwitch
    }
  }

  function set(k: K | null, d?: SortDir) {
    key.value = k
    if (d) dir.value = d
  }

  function sortBy<T>(items: T[], accessor: (row: T, k: K) => SortableValue): T[] {
    if (key.value === null) return items
    const k = key.value
    const factor = dir.value === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const va = accessor(a, k)
      const vb = accessor(b, k)
      return cmp(va, vb) * factor
    })
  }

  return { key, dir, toggle, set, sortBy }
}

function cmp(a: SortableValue, b: SortableValue): number {
  // null/undefined 永遠排在最後
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}
