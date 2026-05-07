import { defineStore } from 'pinia'

export type NotificationType =
  | 'kyc'
  | 'fiat-deposit'
  | 'fiat-withdraw'
  | 'crypto-withdraw'
  | 'bank-account'
  | 'system'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'danger'

export interface NotificationItem {
  id: string
  type: NotificationType
  level: NotificationLevel
  /** i18n key 或純文字（demo 用 i18n key 為主） */
  titleKey: string
  /** 額外說明文字（直接顯示，不過 i18n） */
  body?: string
  createdAt: string
  read: boolean
}

const STORAGE_KEY = 'trader-notifications-v1'
const MAX_ITEMS = 50

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const hydrated = ref(false)

  const unreadCount = computed(() => items.value.filter(i => !i.read).length)

  function hydrate() {
    if (hydrated.value) return
    hydrated.value = true
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) items.value = parsed.slice(0, MAX_ITEMS)
      }
    } catch {}
  }

  function persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    } catch {}
  }

  function push(input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) {
    const item: NotificationItem = {
      ...input,
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false
    }
    items.value = [item, ...items.value].slice(0, MAX_ITEMS)
    persist()
  }

  function markRead(id: string) {
    const target = items.value.find(i => i.id === id)
    if (target && !target.read) {
      target.read = true
      persist()
    }
  }

  function markAllRead() {
    let dirty = false
    for (const i of items.value) {
      if (!i.read) { i.read = true; dirty = true }
    }
    if (dirty) persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  return { items, hydrated, unreadCount, hydrate, push, markRead, markAllRead, clear, persist }
})
