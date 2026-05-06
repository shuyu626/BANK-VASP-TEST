// Idle 自動登出：超過 timeoutMs 無互動 → 呼叫 onLogout，並 (可選) 提示 toast。
// 透過 @vueuse/core 的 useIdle 偵測。
import { useIdle } from '@vueuse/core'

interface UseIdleLogoutOptions {
  /** 多久無互動視為 idle（毫秒） */
  timeoutMs: number
  /** 觸發登出的回呼 */
  onLogout: () => void | Promise<void>
  /** 啟用條件：未登入時 idle timer 沒意義 */
  enabled?: () => boolean
}

export function useIdleLogout(opts: UseIdleLogoutOptions) {
  const enabled = opts.enabled ?? (() => true)
  const { idle } = useIdle(opts.timeoutMs, {
    initialState: false,
    listenForVisibilityChange: true
  })

  const triggered = ref(false)

  watch(idle, async (isIdle) => {
    if (!isIdle) return
    if (!enabled()) return
    if (triggered.value) return
    triggered.value = true
    try {
      await opts.onLogout()
    } catch {
      // 安靜失敗即可，下次互動會 reset idle
    }
  })

  return { idle, triggered }
}
