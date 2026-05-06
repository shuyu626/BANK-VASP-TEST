import { storeToRefs } from 'pinia'
import { useFavoritesStore } from '~/stores/favorites'

// Thin wrapper：保持原本的 API，背後接 Pinia store（解多分頁同步問題）。
export function useFavorites() {
  const store = useFavoritesStore()
  if (import.meta.client) store.hydrate()
  const { favorites } = storeToRefs(store)
  return {
    favorites: readonly(favorites),
    toggle: store.toggle,
    isFavorite: store.isFavorite
  }
}
