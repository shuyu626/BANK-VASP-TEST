// 分頁按鈕序列的純函式計算邏輯，抽出方便單元測試。
// 演算法參考 MUI Pagination：boundaryCount 固定頭尾、siblingCount 控制當前頁兩側，
// 透過 sibling 區段對稱補齊，邊緣頁時按鈕數量仍維持穩定。

export type PageItem = { type: 'page'; page: number } | { type: 'ellipsis' }

export interface ComputePageItemsParams {
  /** 當前頁碼（1-based） */
  page: number
  /** 總頁數（>= 1） */
  count: number
  /** 頭尾固定顯示的頁數，預設 1 */
  boundaryCount?: number
  /** 當前頁兩側顯示的頁數，預設 1 */
  siblingCount?: number
}

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i)
}

export function computePageItems(params: ComputePageItemsParams): PageItem[] {
  const { page, count, boundaryCount = 1, siblingCount = 1 } = params

  const startPages = range(1, Math.min(boundaryCount, count))
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count)

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  )

  const firstEndPage = endPages[0]
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    firstEndPage !== undefined ? firstEndPage - 2 : count - 1,
  )

  const items: PageItem[] = []

  startPages.forEach((p) => items.push({ type: 'page', page: p }))

  if (siblingsStart > boundaryCount + 2) {
    items.push({ type: 'ellipsis' })
  } else if (boundaryCount + 1 < count - boundaryCount) {
    items.push({ type: 'page', page: boundaryCount + 1 })
  }

  range(siblingsStart, siblingsEnd).forEach((p) => items.push({ type: 'page', page: p }))

  if (siblingsEnd < count - boundaryCount - 1) {
    items.push({ type: 'ellipsis' })
  } else if (count - boundaryCount > boundaryCount) {
    items.push({ type: 'page', page: count - boundaryCount })
  }

  endPages.forEach((p) => items.push({ type: 'page', page: p }))

  return items
}
