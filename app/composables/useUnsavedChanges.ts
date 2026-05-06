// 未存檔警示：表單若有未送出資料 → 攔截 tab 關閉 / 路由切換
// - beforeunload: 處理瀏覽器分頁關閉、重新整理
// - onBeforeRouteLeave: 處理 Nuxt 內部路由切換
import { onBeforeRouteLeave } from 'vue-router'

interface UseUnsavedChangesOptions {
  /** 是否有未存檔資料 */
  isDirty: () => boolean
  /** 確認對話框訊息（瀏覽器 beforeunload 多半會忽略字串，但仍須回傳）*/
  message?: () => string
}

export function useUnsavedChanges(opts: UseUnsavedChangesOptions) {
  // Composable 不在元件 setup 的 i18n local scope 內，必須明示 global 才不會噴
  // [intlify] Not found parent scope. use the global scope.
  const { t } = useI18n({ useScope: 'global' })
  const { confirm } = useConfirm()
  const message = opts.message ?? (() => t('common.unsavedChanges.confirm'))

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (!opts.isDirty()) return
    e.preventDefault()
    // 關分頁 / 重整：瀏覽器強制接管對話框，訊息文字現代瀏覽器多半忽略，仍須回傳
    e.returnValue = message()
    return message()
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  // 站內路由切換：走自訂 confirm dialog（BaseConfirmHost）
  onBeforeRouteLeave(async () => {
    if (!opts.isDirty()) return true
    return await confirm({
      title: t('common.unsavedChanges.title'),
      message: message(),
      variant: 'danger',
      confirmText: t('common.unsavedChanges.leave'),
      cancelText: t('common.unsavedChanges.stay')
    })
  })
}
