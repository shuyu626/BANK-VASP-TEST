import { defineStore } from 'pinia'

const STORAGE_KEY = 'trader:favorites'

// Trader 我的最愛幣對。Setup store + localStorage 持久化 + storage 事件多分頁同步。
export const useFavoritesStore = defineStore('favorites', () => {
  const favorites = ref<Set<string>>(new Set())
  const hydrated = ref(false)

  function readFromStorage(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return new Set()
      const arr = JSON.parse(raw)
      return new Set(Array.isArray(arr) ? (arr as string[]) : [])
    } catch {
      return new Set()
    }
  }

  function persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites.value]))
    } catch {
      // ignore quota errors
    }
  }

  function hydrate() {
    if (hydrated.value || typeof localStorage === 'undefined') return
    favorites.value = readFromStorage()
    hydrated.value = true
    window.addEventListener('storage', onStorage)
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY) return
    favorites.value = readFromStorage()
  }

  function toggle(symbol: string) {
    const next = new Set(favorites.value)
    if (next.has(symbol)) next.delete(symbol)
    else next.add(symbol)
    favorites.value = next
    persist()
  }

  function isFavorite(symbol: string): boolean {
    return favorites.value.has(symbol)
  }

  return { favorites, hydrate, toggle, isFavorite }
})
