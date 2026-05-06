// 封裝 setInterval 的常見模式：onMounted 啟動、onBeforeUnmount 清除、
// 滿足 stopWhen 條件時自動停止輪詢。

interface PollingOptions {
  /** 輪詢間隔毫秒 */
  intervalMs: number
  /** 元件 mount 時是否自動啟動，預設 false */
  immediate?: boolean
  /** 啟動時是否先跑一次 fn，預設 false */
  runOnStart?: boolean
  /** 每次跑完後檢查；回傳 false 即停止輪詢 */
  shouldContinue?: () => boolean
}

export function usePolling(
  fn: () => void | Promise<void>,
  options: PollingOptions
) {
  let handle: ReturnType<typeof setInterval> | null = null
  const isRunning = ref(false)

  async function tick() {
    await fn()
    if (options.shouldContinue && !options.shouldContinue()) {
      stop()
    }
  }

  async function start() {
    if (handle) return
    isRunning.value = true
    if (options.runOnStart) await tick()
    handle = setInterval(tick, options.intervalMs)
  }

  function stop() {
    if (handle) {
      clearInterval(handle)
      handle = null
    }
    isRunning.value = false
  }

  if (options.immediate) {
    onMounted(start)
  }
  onBeforeUnmount(stop)

  return { start, stop, isRunning: readonly(isRunning) }
}
