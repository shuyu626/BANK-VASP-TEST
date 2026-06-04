import { Comment, Fragment, Text } from 'vue'

import type { VNode } from 'vue'

/**
 * 攤平 slot 回傳的 VNode 陣列，並濾掉非元件節點。
 *
 * 規則：
 *   - Fragment（v-for / <template> 產生）→ 取出其 children 攤平一層
 *   - 註解節點 `<!-- -->`、純文字、原生標籤字串（'div'、'svg'…）→ 略過
 *   - 其餘（具名 / 匯入的元件）→ 保留
 *
 * 設計取捨：刻意只保留「元件 VNode」，因為 BaseAvatarGroup 會用 cloneVNode 注入
 * size / rounded 等 BaseAvatar 專屬 props，原生標籤接收不到這些 props 也無意義。
 *
 * @param nodes slot 函式的回傳值，例如 `slots.default?.()`
 * @returns 過濾後的 VNode 陣列；輸入為 undefined 時回傳 null
 */
export default function resolveSlotChildren(nodes: VNode[] | undefined): VNode[] | null {
  if (!nodes) return null

  return nodes.flatMap<VNode>((node) => {
    // Fragment：取其 children（通常是 v-for 展開的陣列）攤平一層
    if (node.type === Fragment) {
      return Array.isArray(node.children) ? (node.children as VNode[]) : []
    }
    // 註解、純文字、原生標籤 → 丟棄
    if (node.type === Comment || node.type === Text || typeof node.type === 'string') {
      return []
    }
    return [node]
  }).filter(Boolean)
}
