import { defineStore } from 'pinia'
import type { TraderPrefs } from '~~/shared/types'

const STORAGE_KEY = 'trader:prefs'
const DEFAULT_PREFS: TraderPrefs = {
  marketColors: 'asian',
  defaultPair: 'BTC-TWD',
  notifications: { email: true, inApp: true }
}

function normalize(parsed: Partial<TraderPrefs>): TraderPrefs {
  return {
    marketColors: parsed.marketColors === 'western' ? 'western' : 'asian',
    defaultPair: typeof parsed.defaultPair === 'string' ? parsed.defaultPair : DEFAULT_PREFS.defaultPair,
    notifications: {
      email: parsed.notifications?.email !== false,
      inApp: parsed.notifications?.inApp !== false
    }
  }
}

// Trader 偏好設定。Setup store + localStorage + storage 事件 + DOM dataset 同步。
export const useTraderPrefsStore = defineStore('trader-prefs', () => {
  const prefs = ref<TraderPrefs>({ ...DEFAULT_PREFS })
  const hydrated = ref(false)

  function applyDOM() {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.marketColors = prefs.value.marketColors
  }

  function readFromStorage(): TraderPrefs {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_PREFS }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_PREFS }
      return normalize(JSON.parse(raw) as Partial<TraderPrefs>)
    } catch {
      return { ...DEFAULT_PREFS }
    }
  }

  function persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value))
    } catch {}
    applyDOM()
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY) return
    prefs.value = readFromStorage()
    applyDOM()
  }

  function hydrate() {
    if (hydrated.value || typeof localStorage === 'undefined') return
    prefs.value = readFromStorage()
    hydrated.value = true
    applyDOM()
    window.addEventListener('storage', onStorage)
  }

  function update(patch: Partial<TraderPrefs>) {
    prefs.value = {
      ...prefs.value,
      ...patch,
      notifications: { ...prefs.value.notifications, ...(patch.notifications ?? {}) }
    }
    persist()
  }

  return { prefs, hydrate, update }
})
