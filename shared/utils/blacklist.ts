// Mock OFAC SDN / 國際黑名單比對。
// 真實情境會接 Chainalysis / Elliptic / TRM Labs 等 API。
// 本 demo 用 hardcoded patterns + admin 端維護的動態條目共同 match。

export interface BlacklistMatch {
  hit: boolean
  reason?: string
  source?: string
}

export interface BlacklistEntry {
  id: string
  pattern: string
  reason: string
  source: string
  createdAt?: string
}

/**
 * 黑名單預設種子；admin 可在後台新增/刪除動態條目，最後合併使用。
 * 為了 demo 好觸發，列幾個容易觀察到的 pattern。
 */
export const BLACKLIST_DEFAULTS: BlacklistEntry[] = [
  { id: 'bl_001', pattern: 'bc1q9rdf', reason: 'OFAC SDN — 關聯俄羅斯制裁實體', source: 'OFAC' },
  { id: 'bl_002', pattern: '1MZQHMNg7yWdJSh43oBxWpfVQfzPwaA6Vh', reason: 'OFAC SDN — Lazarus Group 關聯', source: 'OFAC' },
  { id: 'bl_003', pattern: 'TXBLACKLIST', reason: 'TRC-20 黑名單地址（demo）', source: 'TRM' },
  { id: 'bl_004', pattern: '0xDEAD0000', reason: '已知駭客錢包（demo）', source: 'Chainalysis' },
  { id: 'bl_005', pattern: 'BLACKLIST', reason: 'Demo 黑名單觸發字串', source: 'demo' }
]

export function checkBlacklist(
  address: string,
  entries: BlacklistEntry[] = BLACKLIST_DEFAULTS
): BlacklistMatch {
  if (!address || address.length < 4) return { hit: false }
  const lc = address.toLowerCase()
  for (const e of entries) {
    if (lc.includes(e.pattern.toLowerCase())) {
      return { hit: true, reason: e.reason, source: e.source }
    }
  }
  return { hit: false }
}

/** Demo 觸發字串（用於文件 / 提示） */
export const BLACKLIST_DEMO_HINT = 'BLACKLIST'
