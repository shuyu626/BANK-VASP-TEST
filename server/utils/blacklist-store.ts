import { BLACKLIST_DEFAULTS, type BlacklistEntry } from '~~/shared/utils/blacklist'

// In-memory 黑名單清單，由預設種子初始化，admin 可動態 CRUD。
// Process 重啟即重置（與其他 mock store 一致）。

const entries: BlacklistEntry[] = BLACKLIST_DEFAULTS.map((e) => ({ ...e }))

export const blacklistStore = {
  list(): BlacklistEntry[] {
    return entries.slice()
  },

  add(input: Omit<BlacklistEntry, 'id' | 'createdAt'>): BlacklistEntry {
    const entry: BlacklistEntry = {
      id: `bl_${Math.random().toString(36).slice(2, 10)}`,
      pattern: input.pattern,
      reason: input.reason,
      source: input.source,
      createdAt: new Date().toISOString()
    }
    entries.push(entry)
    return entry
  },

  remove(id: string): boolean {
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) return false
    entries.splice(idx, 1)
    return true
  },

  /** 同 pattern 是否已存在（避免 admin 重複新增） */
  hasPattern(pattern: string): boolean {
    return entries.some((e) => e.pattern.toLowerCase() === pattern.toLowerCase())
  }
}
