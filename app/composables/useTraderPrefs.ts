import { storeToRefs } from 'pinia'
import { useTraderPrefsStore } from '~/stores/trader-prefs'

// Thin wrapper：保持原本的 API，背後接 Pinia store（解多分頁同步問題）。
export function useTraderPrefs() {
  const store = useTraderPrefsStore()
  if (import.meta.client) store.hydrate()
  const { prefs } = storeToRefs(store)
  return {
    prefs: readonly(prefs),
    update: store.update
  }
}
