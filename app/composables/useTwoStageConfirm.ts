// 兩階段確認 + 倒數：常見於不可逆操作（提幣 / 轉帳 / 帳號註銷）。
// stage 流程：edit → countdown → ready → submitted（→ 自動回 edit）
//
// 用法：
//   const { stage, countdownSec, start, cancel, finish, reset } = useTwoStageConfirm({ countdownSec: 60 })
//   start()        // edit → countdown
//   finish()       // ready → submitted
//   reset()        // any → edit

interface UseTwoStageConfirmOptions {
  /** 倒數秒數，預設 60 */
  countdownSec?: number
}

export type ConfirmStage = 'edit' | 'countdown' | 'ready' | 'submitted'

export function useTwoStageConfirm(opts: UseTwoStageConfirmOptions = {}) {
  const totalSec = opts.countdownSec ?? 60
  const stage = ref<ConfirmStage>('edit')
  const countdownSec = ref(totalSec)
  let handle: ReturnType<typeof setInterval> | null = null

  function clear() {
    if (handle) {
      clearInterval(handle)
      handle = null
    }
  }

  function start() {
    stage.value = 'countdown'
    countdownSec.value = totalSec
    clear()
    handle = setInterval(() => {
      countdownSec.value -= 1
      if (countdownSec.value <= 0) {
        clear()
        stage.value = 'ready'
      }
    }, 1000)
  }

  function cancel() {
    clear()
    stage.value = 'edit'
  }

  function finish() {
    clear()
    stage.value = 'submitted'
  }

  function reset() {
    clear()
    stage.value = 'edit'
    countdownSec.value = totalSec
  }

  onBeforeUnmount(clear)

  return { stage, countdownSec, start, cancel, finish, reset }
}
