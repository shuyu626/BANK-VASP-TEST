/**
 * DOM 焦點導覽工具
 *
 * 為 ARIA 容器（tablist、menu、listbox 等需要 roving tabindex 的元件）
 * 提供方向鍵焦點移動。。
 *
 * 設計重點：
 *   - 文字節點與 disabled 元素會被自動略過
 *   - 走到頭/尾會 wrap-around 回到另一端（符合 ARIA Authoring Practices）
 *   - 全部停用時不會無限迴圈（用 Set 紀錄已造訪節點）
 */

/** 給 `moveFocus` 的策略函式：給定當前焦點，回傳下一個候選元素 */
interface TraversalFunction {
  (container: HTMLElement, currentFocus: HTMLElement | null): HTMLElement | null
}

/** 取得容器內第一個元素子節點，略過 nodeType=3 文字節點 */
export function firstChild(container: HTMLElement): HTMLElement | null {
  let child = container.firstChild
  while (child?.nodeType === 3) {
    child = child.nextSibling
  }
  return child as HTMLElement | null
}

/** 取得容器內最後一個元素子節點，略過文字節點 */
export function lastChild(container: HTMLElement): HTMLElement | null {
  let child = container.lastChild
  while (child?.nodeType === 3) {
    child = child.previousSibling
  }
  return child as HTMLElement | null
}

/** 下一個元素手足；走到尾端 wrap 回第一個 */
export function nextItem(container: HTMLElement, item: HTMLElement | null): HTMLElement | null {
  if (item && item.nextElementSibling) {
    return item.nextElementSibling as HTMLElement
  }
  return firstChild(container)
}

/** 上一個元素手足；走到開頭 wrap 回最後一個 */
export function previousItem(container: HTMLElement, item: HTMLElement | null): HTMLElement | null {
  if (item && item.previousElementSibling) {
    return item.previousElementSibling as HTMLElement
  }
  return lastChild(container)
}

/**
 * 在 `container` 內依 `traversalFn` 策略移動焦點，並略過 disabled 元素。
 *
 * 行為：
 *   1. 從 `currentFocus` 出發、套用 `traversalFn` 找下一個候選
 *   2. 若候選沒有 `tabindex` 屬性、或 `disabled` / `aria-disabled="true"` → 繼續往下找
 *   3. 找到可聚焦元素 → 呼叫 `.focus()` 並回傳 `true`
 *   4. 全部不可聚焦（含所有元素都已造訪過） → 回傳 `false`，焦點不變
 *
 * 鍵盤對應慣例：
 *   - ArrowRight / ArrowDown → 搭配 `nextItem`
 *   - ArrowLeft  / ArrowUp   → 搭配 `previousItem`
 *   - Home → 傳 `currentFocus=null` + `nextItem`（從第一個開始找）
 *   - End  → 傳 `currentFocus=null` + `previousItem`（從最後一個開始找）
 */
export function moveFocus(
  container: HTMLElement,
  currentFocus: HTMLElement | null,
  traversalFn: TraversalFunction,
): boolean {
  let nextFocus = traversalFn(container, currentFocus)
  // 記錄已造訪節點，避免「全部 disabled」時靠 wrap-around 無限繞圈
  const visited = new Set<HTMLElement>()

  while (nextFocus && !visited.has(nextFocus)) {
    visited.add(nextFocus)

    const disabled
      = (nextFocus as HTMLButtonElement).disabled
      || nextFocus.getAttribute?.('aria-disabled') === 'true'

    if (!nextFocus.hasAttribute?.('tabindex') || disabled) {
      nextFocus = traversalFn(container, nextFocus)
    }
    else {
      nextFocus.focus()
      return true
    }
  }
  return false
}
