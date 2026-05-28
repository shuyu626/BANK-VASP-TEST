// 全域追蹤目前開啟中的 popup（modal、confirm）。
// 解決兩件事：
//   1. 多層彈窗時，只有最上層應該回應 Escape / 點背景關閉。
//   2. Body scroll-lock 跨層共享：第一個開時鎖、最後一個關時才解。
// 採 module-scope 是刻意的——stack 必須是跨所有實例的單一真相，且純 client-only。

// 由舊到新排序，最後一筆 = 最上層 popup。
const stack: number[] = []
let counter = 0

function lockBody() {
  if (typeof document === 'undefined') return
  // 補上 overflow:hidden 後消失的捲軸寬度，避免版面瞬間往右跳。
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
  document.body.style.overflow = 'hidden'
}

function unlockBody() {
  if (typeof document === 'undefined') return
  document.body.style.paddingRight = ''
  document.body.style.overflow = ''
}

export function usePopupStack() {
  // 開啟時呼叫：推上 stack，第一個 popup 順手鎖 body，回傳這次的唯一 id。
  function register(): number {
    const id = ++counter
    if (stack.length === 0) lockBody()
    stack.push(id)
    return id
  }

  // 關閉時呼叫：把自己從 stack 拔掉，stack 清空才解鎖 body；id 不存在則無動作。
  function unregister(id: number): void {
    const idx = stack.indexOf(id)
    if (idx === -1) return
    stack.splice(idx, 1)
    if (stack.length === 0) unlockBody()
  }

  // 判斷是否為最上層，用來決定 Escape / 背景點擊該由誰處理。
  function isTop(id: number): boolean {
    return stack.length > 0 && stack[stack.length - 1] === id
  }

  return { register, unregister, isTop }
}

// 僅供 vitest beforeEach 重置 module 狀態，正式程式碼請勿呼叫。
export function __resetPopupStack(): void {
  stack.length = 0
  counter = 0
  if (typeof document !== 'undefined') {
    document.body.style.paddingRight = ''
    document.body.style.overflow = ''
  }
}
