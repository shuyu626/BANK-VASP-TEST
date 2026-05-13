# Audit Stream Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. CLAUDE.md 規範也允許用 `/opsx:apply` 銜接 OpenSpec tasks.md 的進度追蹤。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `/admin/audit` 從分頁式列表改造為時間視窗式虛擬捲動串流，支援 50000+ 筆 mock 資料、全文搜尋、jump-to-date、CSV 匯出、側邊 detail panel。

**Architecture:** 三層職責分離 — server route 只處理時間視窗；`useAuditStream` composable 掌管業務邏輯（filter、search、loadMore、CSV）；page 持有 `@tanstack/vue-virtual` scroll container 並組合元件。Detail UX 由 inline expand 改為固定 44px row + 側邊 panel，避免動態 row height 帶來的虛擬化複雜度。

**Tech Stack:** Nuxt 4 + Vue 3 `<script setup lang="ts">`, TypeScript strict (no `any`), Pinia + storeToRefs, `@tanstack/vue-virtual ^3`, `@vueuse/core`, Tailwind + SCSS CSS variables, Vitest + happy-dom。

**Source spec:** `openspec/changes/audit-stream-virtualization/{proposal,design,tasks}.md` 與 `specs/admin-audit-log/spec.md`。

**Commit policy（重要）:** 使用者目前指示「不要 commit」。每個 task 仍標出**邏輯 commit 邊界**（"Checkpoint" 段落），但實際 `git commit` 動作延後，等使用者放行再批次處理。

---

## File Structure

| 路徑 | 動作 | 職責 |
|------|------|------|
| `package.json` | Modify | 加入 `@tanstack/vue-virtual ^3` runtime dep |
| `app/utils/mock/compliance.ts` | Modify | 擴張 `mockAuditLogs` 為 50000+ 筆，時間衰減分布 |
| `app/utils/mock/audit-seed.ts` | Create | audit 專用 seed 產生器（保 compliance.ts 簡潔） |
| `server/api/admin/audit.get.ts` | Modify | 收斂 query schema 至 `since/until/limit` |
| `server/utils/audit-window.ts` | Create | 純函式 `applyAuditWindow(entries, since, until, limit)`，可測 |
| `app/composables/useAuditStream.ts` | Create | 時間視窗、filter、search、loadMore、CSV、jump-to-date |
| `app/components/admin/AuditFilterBar.vue` | Create | filter bar (defineModel<AuditFilters>) |
| `app/components/admin/AuditStreamRow.vue` | Create | 固定 44px row，emit select |
| `app/components/admin/AuditDetailPanel.vue` | Create | 側邊 detail panel |
| `app/pages/admin/audit.vue` | Rewrite | 整合 composable + 元件 + virtualizer |
| `i18n/locales/zh-TW.json` | Modify | 新增 `admin.audit.stream.*` 區塊 |
| `i18n/locales/en.json` | Modify | 新增 `admin.audit.stream.*` 區塊 |
| `tests/server/audit-window.test.ts` | Create | `applyAuditWindow` 單元測試 |
| `tests/composables/useAuditStream.test.ts` | Create | composable 單元測試 |
| `tests/utils/mock/audit-seed.test.ts` | Create | seed 產生器單元測試（總數、衰減分布、決定性） |

---

## Task 1: 安裝依賴

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1: 安裝 `@tanstack/vue-virtual`**

```bash
source ~/.nvm/nvm.sh && nvm use && npm install @tanstack/vue-virtual@^3
```

預期：`package.json` 與 `package-lock.json` 更新，`node_modules/@tanstack/vue-virtual` 出現。

- [ ] **Step 1.2: 驗證 typecheck**

```bash
npm run typecheck
```

預期：EXIT=0。若失敗請先停下檢查與 Vue 3 / Nuxt 4 是否相容。

**Checkpoint:** 「chore(deps): add @tanstack/vue-virtual ^3」（不立即 commit）

---

## Task 2: 抽出 audit window 純函式 + 收斂 server API

把 server endpoint 內部的「時間視窗 + 排序 + slice」抽到純函式，方便測試。

**Files:**
- Create: `server/utils/audit-window.ts`
- Create: `tests/server/audit-window.test.ts`
- Modify: `server/api/admin/audit.get.ts`

- [ ] **Step 2.1: 寫 `applyAuditWindow` 失敗測試**

`tests/server/audit-window.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AuditLog } from '~~/shared/types'
import { applyAuditWindow } from '~~/server/utils/audit-window'

const mk = (id: string, ts: string): AuditLog => ({
  id, actor: 'a', actorRole: 'system', action: 'x', resourceType: 'r', resourceId: 'rid',
  metadata: {}, ipAddress: null, timestamp: ts
})

describe('applyAuditWindow', () => {
  it('returns entries within [since, until], inclusive bounds', () => {
    const entries = [mk('1','2026-04-01T00:00:00Z'), mk('2','2026-04-15T00:00:00Z'), mk('3','2026-05-01T00:00:00Z')]
    const out = applyAuditWindow(entries, '2026-04-10T00:00:00Z', '2026-04-30T00:00:00Z', 100)
    expect(out.map(e => e.id)).toEqual(['2'])
  })

  it('sorts by timestamp desc', () => {
    const entries = [mk('1','2026-04-01T00:00:00Z'), mk('2','2026-05-01T00:00:00Z'), mk('3','2026-04-15T00:00:00Z')]
    const out = applyAuditWindow(entries, undefined, undefined, 100)
    expect(out.map(e => e.id)).toEqual(['2', '3', '1'])
  })

  it('truncates to limit after sort', () => {
    const entries = Array.from({length: 10}, (_, i) => mk(String(i), `2026-04-${String(i+1).padStart(2,'0')}T00:00:00Z`))
    const out = applyAuditWindow(entries, undefined, undefined, 3)
    expect(out).toHaveLength(3)
    expect(out[0]!.id).toBe('9')
  })

  it('defaults until to now when omitted', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const entries = [mk('past','2026-04-01T00:00:00Z'), mk('future', future)]
    const out = applyAuditWindow(entries, undefined, undefined, 100)
    expect(out.map(e => e.id)).toContain('past')
    // future entries beyond now should not appear when until omitted
  })
})
```

- [ ] **Step 2.2: Run test — verify fails**

```bash
npm test -- audit-window
```

Expected: FAIL（`applyAuditWindow` 尚未存在）

- [ ] **Step 2.3: 實作 `applyAuditWindow`**

`server/utils/audit-window.ts`:

```ts
import type { AuditLog } from '~~/shared/types'

export function applyAuditWindow(
  entries: AuditLog[],
  since: string | undefined,
  until: string | undefined,
  limit: number
): AuditLog[] {
  const upper = until ?? new Date().toISOString()
  let out = entries
  if (since) out = out.filter(e => e.timestamp >= since)
  out = out.filter(e => e.timestamp <= upper)
  return [...out].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit)
}
```

- [ ] **Step 2.4: Run test — verify passes**

```bash
npm test -- audit-window
```

Expected: PASS（4 tests）

- [ ] **Step 2.5: 改寫 `server/api/admin/audit.get.ts`**

```ts
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'
import { applyAuditWindow } from '~~/server/utils/audit-window'

const QuerySchema = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(5000)
})

export default defineEventHandler((event) => {
  requireAdmin(event)
  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { since, until, limit } = parsed.data
  const all = traderStore.getAuditLog()
  const entries = applyAuditWindow(all, since, until, limit)
  return { entries, totalInLog: all.length }
})
```

- [ ] **Step 2.6: typecheck + 全部測試 pass**

```bash
npm run typecheck && npm test
```

Expected: 全部通過。

**Checkpoint:** 「refactor(server): narrow audit endpoint to time window + extract pure window function」

---

## Task 3: 擴張 audit mock seed

**Files:**
- Create: `app/utils/mock/audit-seed.ts`
- Modify: `app/utils/mock/compliance.ts`
- Create: `tests/utils/mock/audit-seed.test.ts`

- [ ] **Step 3.1: 寫 seed 產生器失敗測試**

`tests/utils/mock/audit-seed.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateAuditSeed } from '~/utils/mock/audit-seed'

describe('generateAuditSeed', () => {
  const NOW = new Date('2026-05-08T12:00:00Z').getTime()

  it('produces at least 50000 entries', () => {
    const out = generateAuditSeed({ count: 50000, now: NOW })
    expect(out.length).toBeGreaterThanOrEqual(50000)
  })

  it('is deterministic for same seed', () => {
    const a = generateAuditSeed({ count: 1000, now: NOW })
    const b = generateAuditSeed({ count: 1000, now: NOW })
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id))
    expect(a.map(e => e.timestamp)).toEqual(b.map(e => e.timestamp))
  })

  it('time distribution is recency-skewed (within tolerance)', () => {
    const out = generateAuditSeed({ count: 10000, now: NOW })
    const within = (days: number) => out.filter(e => (NOW - new Date(e.timestamp).getTime()) / 86400000 <= days).length
    const last7 = within(7)
    const last30 = within(30) - last7
    const last90 = within(90) - within(30)
    // 4:3:2:1 with ±10% tolerance
    expect(last7).toBeGreaterThan(3500)
    expect(last7).toBeLessThan(4500)
    expect(last30).toBeGreaterThan(2500)
    expect(last30).toBeLessThan(3500)
    expect(last90).toBeGreaterThan(1500)
    expect(last90).toBeLessThan(2500)
  })

  it('action vocabulary has at least 25 distinct values', () => {
    const out = generateAuditSeed({ count: 5000, now: NOW })
    const distinct = new Set(out.map(e => e.action))
    expect(distinct.size).toBeGreaterThanOrEqual(25)
  })

  it('all entries pass AuditLogSchema', () => {
    const out = generateAuditSeed({ count: 100, now: NOW })
    // structural shape check
    out.forEach(e => {
      expect(typeof e.id).toBe('string')
      expect(typeof e.timestamp).toBe('string')
      expect(['user','admin','compliance','ops','risk','bank','system']).toContain(e.actorRole)
    })
  })
})
```

- [ ] **Step 3.2: Run test — verify fails**

```bash
npm test -- audit-seed
```

Expected: FAIL（檔案不存在）

- [ ] **Step 3.3: 實作 `audit-seed.ts`**

`app/utils/mock/audit-seed.ts`:

```ts
import type { AuditLog } from '~~/shared/types'
import { createSeededRandom, hashSeed } from './seed'

interface AuditSeedOptions {
  count: number
  now: number   // epoch ms
}

const ACTOR_ROLES: AuditLog['actorRole'][] = ['user','admin','compliance','ops','risk','bank','system']

const ACTIONS_BY_DOMAIN: Record<string, string[]> = {
  kyc:    ['kyc.submit','kyc.approve','kyc.reject','kyc.tier-upgrade','kyc.review.start','kyc.review.escalate'],
  risk:   ['risk.alert.trigger','risk.alert.resolve','risk.alert.escalate','risk.threshold.update'],
  fiat:   ['fiat.deposit.confirm','fiat.deposit.hold','fiat.deposit.release','fiat.withdraw.request','fiat.withdraw.approve','fiat.withdraw.reject'],
  order:  ['order.place','order.cancel','order.fill'],
  report: ['report.ctr.create','report.ctr.submit','report.sar.create','report.sar.submit','report.regulator.export'],
  auth:   ['auth.login','auth.logout','auth.password-change','auth.2fa.enable']
}

const RESOURCE_TYPES = ['kyc','aml','deposit','withdrawal','order','session','ctr','sar','user','setting']

const DECAY_BUCKETS = [
  { maxDays:   7, weight: 4 },
  { maxDays:  30, weight: 3 },
  { maxDays:  90, weight: 2 },
  { maxDays: 365, weight: 1 }
]

export function generateAuditSeed(opts: AuditSeedOptions): AuditLog[] {
  const { count, now } = opts
  const rand = createSeededRandom(hashSeed(`audit-seed-${count}-${now}`))
  const allActions = Object.values(ACTIONS_BY_DOMAIN).flat()
  const totalWeight = DECAY_BUCKETS.reduce((s, b) => s + b.weight, 0)

  const out: AuditLog[] = []
  for (let i = 0; i < count; i++) {
    // pick bucket by weight
    const r = rand() * totalWeight
    let acc = 0
    let bucket = DECAY_BUCKETS[0]!
    let prevMaxDays = 0
    for (const b of DECAY_BUCKETS) {
      acc += b.weight
      if (r <= acc) { bucket = b; break }
      prevMaxDays = b.maxDays
    }
    // random offset days within bucket
    const offsetDays = prevMaxDays + rand() * (bucket.maxDays - prevMaxDays)
    const ts = new Date(now - offsetDays * 86400000 - rand() * 86400000).toISOString()

    const action = allActions[Math.floor(rand() * allActions.length)]!
    const actorRole = ACTOR_ROLES[Math.floor(rand() * ACTOR_ROLES.length)]!
    const resourceType = RESOURCE_TYPES[Math.floor(rand() * RESOURCE_TYPES.length)]!
    const isLargeMeta = rand() < 0.07  // ~7% have large metadata
    out.push({
      id: `log_${(100000 + i).toString(36)}`,
      actor: actorRole === 'system' ? 'system' : `${actorRole}_${Math.floor(rand() * 50).toString().padStart(2,'0')}`,
      actorRole,
      action,
      resourceType,
      resourceId: `${resourceType}_${Math.floor(rand() * 9999).toString().padStart(4,'0')}`,
      metadata: isLargeMeta
        ? { trace: 'x'.repeat(600), nested: { keys: Array.from({length:5}, (_,k) => ({ k, v: rand() })) } }
        : { source: action.split('.')[0]! },
      ipAddress: rand() < 0.7 ? `10.${Math.floor(rand()*255)}.${Math.floor(rand()*255)}.${Math.floor(rand()*255)}` : null,
      timestamp: ts
    })
  }
  return out
}
```

- [ ] **Step 3.4: Run test — verify passes**

```bash
npm test -- audit-seed
```

Expected: PASS（5 tests）

- [ ] **Step 3.5: 接到 `compliance.ts`**

修改 `app/utils/mock/compliance.ts` 的 `mockAuditLogs` export：

```ts
import { generateAuditSeed } from './audit-seed'

const seedNow = new Date('2026-05-08T12:00:00Z').getTime()
const generated = generateAuditSeed({ count: 50000, now: seedNow })
// keep existing 5 hand-curated entries to preserve any tests / fixtures referencing them
const handCurated: AuditLog[] = [/* 原本 log_0001..0005 五筆原樣保留 */]
export const mockAuditLogs: AuditLog[] = [...handCurated, ...generated]
```

- [ ] **Step 3.6: typecheck + 完整測試 pass**

```bash
npm run typecheck && npm test
```

**Checkpoint:** 「feat(mock): scale audit log seed to 50k+ with recency decay」

---

## Task 4: `useAuditStream` composable

**Files:**
- Create: `app/composables/useAuditStream.ts`
- Create: `tests/composables/useAuditStream.test.ts`

- [ ] **Step 4.1: 定義 interface 與 contract**

`app/composables/useAuditStream.ts`（最上方）:

```ts
import type { AuditLog } from '~~/shared/types'
import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface AuditFilters {
  searchText: string
  actorRole: string
  actionPrefix: string
  actor: string
  resourceId: string
  windowStart: string  // ISO
  windowEnd: string    // ISO
}

export interface UseAuditStreamReturn {
  filters: Ref<AuditFilters>
  allEntries: Ref<AuditLog[]>
  filteredEntries: ComputedRef<AuditLog[]>
  totalInStore: Ref<number>
  isLoading: Ref<boolean>
  isLoadingMore: Ref<boolean>
  error: Ref<string | null>
  selectedId: Ref<string | null>
  selectedEntry: ComputedRef<AuditLog | null>
  loadInitial: () => Promise<void>
  loadEarlier: (days?: number) => Promise<void>
  jumpToDate: (date: string) => Promise<{ index: number } | { error: 'no-data'; oldest: string | null }>
  exportCsv: () => void
  resetFilters: () => void
}

export function useAuditStream(): UseAuditStreamReturn { /* ... */ }
```

- [ ] **Step 4.2: 寫 filter / search / CSV 失敗測試**

`tests/composables/useAuditStream.test.ts`：

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'

// mock $fetch — composable 透過 globalThis.$fetch 呼叫 API
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// happy-dom global cookie placeholder for ssrCookieHeaders compat
import { useAuditStream } from '~/composables/useAuditStream'
import type { AuditLog } from '~~/shared/types'

const mk = (over: Partial<AuditLog> = {}): AuditLog => ({
  id: over.id ?? 'x',
  actor: over.actor ?? 'a_01',
  actorRole: over.actorRole ?? 'admin',
  action: over.action ?? 'kyc.approve',
  resourceType: over.resourceType ?? 'kyc',
  resourceId: over.resourceId ?? 'kyc_001',
  metadata: over.metadata ?? {},
  ipAddress: over.ipAddress ?? null,
  timestamp: over.timestamp ?? '2026-05-01T00:00:00Z'
})

describe('useAuditStream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('filters by actorRole exactly', async () => {
    mockFetch.mockResolvedValueOnce({ entries: [
      mk({ id:'1', actorRole:'admin' }),
      mk({ id:'2', actorRole:'compliance' })
    ], totalInLog: 2 })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.actorRole = 'compliance'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['2'])
  })

  it('actionPrefix is startsWith', async () => {
    mockFetch.mockResolvedValueOnce({ entries: [
      mk({ id:'a', action:'kyc.approve' }),
      mk({ id:'b', action:'risk.alert.resolve' })
    ], totalInLog: 2 })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.actionPrefix = 'kyc.'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['a'])
  })

  it('searchText matches across metadata JSON', async () => {
    mockFetch.mockResolvedValueOnce({ entries: [
      mk({ id:'has-meta', metadata: { tier: 'tier3' } }),
      mk({ id:'no-meta', metadata: {} })
    ], totalInLog: 2 })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.searchText = 'tier3'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['has-meta'])
  })

  it('loadEarlier prepends + dedupes by id', async () => {
    mockFetch.mockResolvedValueOnce({ entries: [mk({ id:'b' })], totalInLog: 5 })
    const s = useAuditStream()
    await s.loadInitial()
    mockFetch.mockResolvedValueOnce({ entries: [mk({ id:'a' }), mk({ id:'b' })], totalInLog: 5 })
    await s.loadEarlier(30)
    expect(s.allEntries.value.map(e => e.id).sort()).toEqual(['a', 'b'])
  })

  it('exportCsv produces RFC4180-compliant content', async () => {
    mockFetch.mockResolvedValueOnce({ entries: [
      mk({ id:'1', metadata: { msg: 'has "quote" inside' } })
    ], totalInLog: 1 })
    const s = useAuditStream()
    await s.loadInitial()
    // capture Blob URL creation
    const created = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { created(b); return 'blob:x' }, revokeObjectURL: () => {} })
    s.exportCsv()
    expect(created).toHaveBeenCalled()
    const blob: Blob = created.mock.calls[0][0]
    const text = await blob.text()
    expect(text).toContain('has ""quote"" inside')   // double-quote escaping
    expect(text.split('\n')[0]).toBe('timestamp,actorRole,actor,action,resourceType,resourceId,ipAddress,metadata')
  })
})
```

- [ ] **Step 4.3: Run — verify fails**

```bash
npm test -- useAuditStream
```

Expected: FAIL（composable 尚未實作）

- [ ] **Step 4.4: 實作 `useAuditStream`**

關鍵實作點（完整檔案於執行時依此撰寫）:

```ts
export function useAuditStream(): UseAuditStreamReturn {
  const now = new Date()
  const defaults: AuditFilters = {
    searchText: '', actorRole: '', actionPrefix: '', actor: '', resourceId: '',
    windowStart: new Date(now.getTime() - 30 * 86400000).toISOString(),
    windowEnd: now.toISOString()
  }
  const filters = ref<AuditFilters>({ ...defaults })
  const allEntries = ref<AuditLog[]>([])
  const totalInStore = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<string | null>(null)

  const filteredEntries = computed<AuditLog[]>(() => {
    const f = filters.value
    const search = f.searchText.trim().toLowerCase()
    return allEntries.value.filter(e => {
      if (f.actorRole && e.actorRole !== f.actorRole) return false
      if (f.actionPrefix && !e.action.startsWith(f.actionPrefix)) return false
      if (f.actor && e.actor !== f.actor) return false
      if (f.resourceId && e.resourceId !== f.resourceId) return false
      if (search) {
        const haystack = `${e.actor} ${e.action} ${e.resourceType} ${e.resourceId} ${e.ipAddress ?? ''} ${JSON.stringify(e.metadata)}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  })

  const selectedEntry = computed<AuditLog | null>(() => {
    if (!selectedId.value) return null
    return allEntries.value.find(e => e.id === selectedId.value) ?? null
  })

  async function fetchWindow(since: string, until: string): Promise<{ entries: AuditLog[]; totalInLog: number }> {
    return await $fetch('/api/admin/audit', {
      query: { since, until, limit: 5000 },
      headers: ssrCookieHeaders()
    })
  }

  async function loadInitial() {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetchWindow(filters.value.windowStart, filters.value.windowEnd)
      allEntries.value = res.entries
      totalInStore.value = res.totalInLog
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadEarlier(days = 30) {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
    error.value = null
    try {
      const oldStart = filters.value.windowStart
      const newStart = new Date(new Date(oldStart).getTime() - days * 86400000).toISOString()
      const res = await fetchWindow(newStart, oldStart)
      // dedupe by id, prepend
      const existingIds = new Set(allEntries.value.map(e => e.id))
      const merged = [...res.entries.filter(e => !existingIds.has(e.id)), ...allEntries.value]
      // resort desc
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      allEntries.value = merged
      filters.value.windowStart = newStart
      totalInStore.value = res.totalInLog
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      isLoadingMore.value = false
    }
  }

  async function jumpToDate(date: string) {
    const targetStart = `${date}T00:00:00.000Z`
    if (targetStart < filters.value.windowStart) {
      const expandedStart = new Date(new Date(targetStart).getTime() - 7 * 86400000).toISOString()
      const res = await fetchWindow(expandedStart, filters.value.windowStart)
      const existingIds = new Set(allEntries.value.map(e => e.id))
      const merged = [...allEntries.value, ...res.entries.filter(e => !existingIds.has(e.id))]
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      allEntries.value = merged
      filters.value.windowStart = expandedStart
    }
    const idx = filteredEntries.value.findIndex(e => e.timestamp.slice(0, 10) === date)
    if (idx === -1) {
      const oldest = allEntries.value[allEntries.value.length - 1]?.timestamp.slice(0, 10) ?? null
      return { error: 'no-data' as const, oldest }
    }
    return { index: idx }
  }

  function exportCsv() {
    const header = 'timestamp,actorRole,actor,action,resourceType,resourceId,ipAddress,metadata'
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = filteredEntries.value.map(e => [
      e.timestamp, e.actorRole, e.actor, e.action, e.resourceType, e.resourceId,
      e.ipAddress ?? '', JSON.stringify(e.metadata)
    ].map(escape).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
    link.href = url
    link.download = `audit-log-${ts}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function resetFilters() { filters.value = { ...defaults } }

  return {
    filters, allEntries, filteredEntries, totalInStore,
    isLoading, isLoadingMore, error, selectedId, selectedEntry,
    loadInitial, loadEarlier, jumpToDate, exportCsv, resetFilters
  }
}
```

- [ ] **Step 4.5: Run — verify passes**

```bash
npm test -- useAuditStream
```

Expected: PASS（5 tests）

- [ ] **Step 4.6: typecheck**

```bash
npm run typecheck
```

Expected: EXIT=0

**Checkpoint:** 「feat(composables): add useAuditStream for time-window stream + CSV export」

---

## Task 5: `AuditFilterBar` 元件

**Files:**
- Create: `app/components/admin/AuditFilterBar.vue`

由於是純 UI + i18n 串接（composable 已測過邏輯），不寫單獨單元測試（YAGNI），由 page 整合驗證代替。

- [ ] **Step 5.1: 撰寫元件**

關鍵骨架：

```vue
<script setup lang="ts">
import type { AuditFilters } from '~/composables/useAuditStream'
import { useDebounceFn } from '@vueuse/core'

const model = defineModel<AuditFilters>({ required: true })
const emit = defineEmits<{
  exportCsv: []
  jumpToDate: [date: string]
  reset: []
}>()

const jumpDate = ref('')
const localSearch = ref(model.value.searchText)
const debouncedApplySearch = useDebounceFn((v: string) => {
  model.value = { ...model.value, searchText: v }
}, 300)
watch(localSearch, debouncedApplySearch)
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
    <!-- searchText (col-span-3) / actorRole select (col-span-2) / actionPrefix (col-span-2) / actor (col-span-2) / resourceId (col-span-3) -->
    <!-- second row: windowStart, windowEnd, jumpDate, jump button, reset, exportCsv -->
  </div>
</template>
```

i18n keys 全部前綴 `admin.audit.stream.filterBar.*`，搭配 Step 9 一起補。

- [ ] **Step 5.2: typecheck**

```bash
npm run typecheck
```

**Checkpoint:** 「feat(admin): add AuditFilterBar component」

---

## Task 6: `AuditStreamRow` 元件

**Files:**
- Create: `app/components/admin/AuditStreamRow.vue`

- [ ] **Step 6.1: 撰寫元件**

```vue
<script setup lang="ts">
import type { AuditLog } from '~~/shared/types'

defineProps<{
  entry: AuditLog
  active: boolean
  style: Record<string, string>
}>()
defineEmits<{ select: [AuditLog] }>()

const roleColour: Record<string, string> = {
  user: 'bg-neutral-500/20 text-neutral-600',
  system: 'bg-info/20 text-info',
  compliance: 'bg-primary-700 text-white',
  ops: 'bg-primary-500 text-white',
  risk: 'bg-warning text-white',
  bank: 'bg-gold-500 text-white',
  admin: 'bg-neutral-700 text-white'
}
</script>

<template>
  <div
    :style="style"
    class="absolute left-0 right-0 grid grid-cols-12 gap-2 px-3 items-center text-xs cursor-pointer border-b border-border hover:bg-surface-alt"
    :class="active ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''"
    style="height: 44px"
    @click="$emit('select', entry)"
  >
    <span class="col-span-2 num text-text-muted whitespace-nowrap">{{ entry.timestamp.slice(0, 19).replace('T',' ') }}</span>
    <span class="col-span-1">
      <span class="text-[10px] uppercase px-1.5 py-0.5 rounded-sm" :class="roleColour[entry.actorRole] ?? 'bg-neutral-300'">{{ entry.actorRole }}</span>
    </span>
    <span class="col-span-2 font-mono truncate">{{ entry.actor }}</span>
    <span class="col-span-3 truncate">{{ entry.action }}</span>
    <span class="col-span-3 font-mono text-text-muted truncate">{{ entry.resourceType }}:{{ entry.resourceId }}</span>
    <span class="col-span-1 font-mono text-text-muted truncate">{{ entry.ipAddress ?? '—' }}</span>
  </div>
</template>
```

注意：`<div>` + `position:absolute` + `style` (top offset) 配合 virtualizer。

- [ ] **Step 6.2: typecheck**

```bash
npm run typecheck
```

**Checkpoint:** 「feat(admin): add AuditStreamRow virtual row component」

---

## Task 7: `AuditDetailPanel` 元件

**Files:**
- Create: `app/components/admin/AuditDetailPanel.vue`

- [ ] **Step 7.1: 撰寫元件**

```vue
<script setup lang="ts">
import type { AuditLog } from '~~/shared/types'

defineProps<{ entry: AuditLog | null }>()
defineEmits<{ close: [] }>()

async function copyId(id: string) {
  if (import.meta.env.DEV) console.log('copy id', id)
  try { await navigator.clipboard.writeText(id) } catch { /* no-op */ }
}
</script>

<template>
  <aside class="bg-surface border border-border rounded h-full flex flex-col">
    <header class="flex items-center justify-between px-4 py-3 border-b border-border">
      <span class="text-xs uppercase tracking-wider text-text-muted">{{ $t('admin.audit.stream.detail.title') }}</span>
      <button v-if="entry" type="button" class="text-text-muted hover:text-text" @click="$emit('close')">×</button>
    </header>
    <div v-if="entry" class="p-4 space-y-3 overflow-y-auto text-sm">
      <div><span class="text-text-muted">id：</span><span class="font-mono">{{ entry.id }}</span>
        <button type="button" class="ml-2 text-primary-500 text-xs" @click="copyId(entry.id)">{{ $t('admin.audit.stream.detail.copyIdCta') }}</button>
      </div>
      <div><span class="text-text-muted">{{ $t('common.label.time') }}：</span>{{ entry.timestamp }}</div>
      <div><span class="text-text-muted">{{ $t('common.label.actor') }}：</span>{{ entry.actor }} ({{ entry.actorRole }})</div>
      <div><span class="text-text-muted">{{ $t('common.label.action') }}：</span>{{ entry.action }}</div>
      <div><span class="text-text-muted">{{ $t('common.label.resource') }}：</span>{{ entry.resourceType }}:{{ entry.resourceId }}</div>
      <div><span class="text-text-muted">{{ $t('common.label.ip') }}：</span>{{ entry.ipAddress ?? '—' }}</div>
      <div>
        <div class="text-text-muted mb-1">metadata</div>
        <pre class="bg-surface-alt p-3 rounded text-xs overflow-auto max-h-96 font-mono">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
      </div>
    </div>
    <div v-else class="p-8 text-center text-text-muted text-xs">
      {{ $t('admin.audit.stream.detail.placeholder') }}
    </div>
  </aside>
</template>
```

- [ ] **Step 7.2: typecheck**

**Checkpoint:** 「feat(admin): add AuditDetailPanel component」

---

## Task 8: 重寫 `app/pages/admin/audit.vue`

**Files:**
- Modify: `app/pages/admin/audit.vue`

- [ ] **Step 8.1: 重寫 page**

關鍵骨架：

```vue
<script setup lang="ts">
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useAuditStream } from '~/composables/useAuditStream'
import AuditFilterBar from '~/components/admin/AuditFilterBar.vue'
import AuditStreamRow from '~/components/admin/AuditStreamRow.vue'
import AuditDetailPanel from '~/components/admin/AuditDetailPanel.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.audit') }))
const route = useRoute()
const router = useRouter()
const toast = useToast()

const stream = useAuditStream()
await stream.loadInitial()

// Sync URL ?selected= 與 selectedId
const initialSelected = route.query.selected
if (typeof initialSelected === 'string') stream.selectedId.value = initialSelected
watch(() => stream.selectedId.value, (id) => {
  router.replace({ query: { ...route.query, selected: id ?? undefined } })
})

const parentRef = ref<HTMLElement | null>(null)
const rowVirtualizer = useVirtualizer({
  count: computed(() => stream.filteredEntries.value.length),
  getScrollElement: () => parentRef.value,
  estimateSize: () => 44,
  overscan: 10
})

async function handleJumpToDate(date: string) {
  const result = await stream.jumpToDate(date)
  if ('error' in result) {
    toast.show(t('admin.audit.stream.errorNoData', { oldest: result.oldest ?? '—' }))
    return
  }
  rowVirtualizer.value.scrollToIndex(result.index, { align: 'start' })
}

// Mobile overlay state
const isMobileOverlayOpen = computed(() => stream.selectedId.value !== null)
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.audit.stream.title')" :subtitle="$t('admin.audit.stream.subtitle')" />

    <AuditFilterBar
      v-model="stream.filters.value"
      @export-csv="stream.exportCsv()"
      @jump-to-date="handleJumpToDate"
      @reset="stream.resetFilters()"
    />

    <div class="flex items-center justify-between text-xs text-text-muted">
      <span>
        {{ $t('admin.audit.stream.statsBar', {
          shown: stream.filteredEntries.value.length,
          loaded: stream.allEntries.value.length,
          total: stream.totalInStore.value
        }) }}
      </span>
      <BaseButton
        variant="secondary" size="sm"
        :disabled="stream.isLoadingMore.value"
        @click="stream.loadEarlier()"
      >
        {{ stream.isLoadingMore.value ? $t('common.action.loading') : $t('admin.audit.stream.loadEarlier') }}
      </BaseButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <section class="lg:col-span-7 bg-surface border border-border rounded overflow-hidden">
        <!-- Header row -->
        <div class="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-text-muted border-b border-border">
          <span class="col-span-2">{{ $t('common.label.time') }}</span>
          <span class="col-span-1">role</span>
          <span class="col-span-2">{{ $t('common.label.actor') }}</span>
          <span class="col-span-3">{{ $t('common.label.action') }}</span>
          <span class="col-span-3">{{ $t('common.label.resource') }}</span>
          <span class="col-span-1">{{ $t('common.label.ip') }}</span>
        </div>
        <div ref="parentRef" class="overflow-auto" style="height: calc(100vh - 320px);">
          <div :style="{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }">
            <AuditStreamRow
              v-for="vrow in rowVirtualizer.getVirtualItems()"
              :key="stream.filteredEntries.value[vrow.index]?.id"
              :entry="stream.filteredEntries.value[vrow.index]!"
              :active="stream.selectedId.value === stream.filteredEntries.value[vrow.index]?.id"
              :style="{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vrow.start}px)` }"
              @select="stream.selectedId.value = stream.filteredEntries.value[vrow.index]!.id"
            />
          </div>
        </div>
      </section>
      <!-- Desktop side panel -->
      <div class="hidden lg:block lg:col-span-5">
        <AuditDetailPanel :entry="stream.selectedEntry.value" @close="stream.selectedId.value = null" />
      </div>
      <!-- Mobile overlay -->
      <Transition name="slide">
        <div v-if="isMobileOverlayOpen" class="lg:hidden fixed inset-y-0 right-0 w-full sm:w-96 z-50 bg-surface shadow-xl">
          <AuditDetailPanel :entry="stream.selectedEntry.value" @close="stream.selectedId.value = null" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
.slide-enter-active, .slide-leave-active { transition: transform 200ms ease; }
</style>
```

注意點：
- `useVirtualizer` 回傳的 `count` 必須能 reactive 更新，因此包成 computed
- mobile overlay 用 `<Transition>` 而非 `v-show` + class 切換，動畫更乾淨
- header row 與 row body 共用 `grid-cols-12` 對齊

- [ ] **Step 8.2: typecheck**

```bash
npm run typecheck
```

**Checkpoint:** 「feat(admin): rewrite /admin/audit as virtualized stream + side detail panel」

---

## Task 9: i18n 補 key

**Files:**
- Modify: `i18n/locales/zh-TW.json`
- Modify: `i18n/locales/en.json`

- [ ] **Step 9.1: 加入 stream 區塊**

兩邊都在 `admin.audit.*` 內新增：

```jsonc
"stream": {
  "title": "稽核日誌（串流）",
  "subtitle": "時間視窗虛擬捲動 — 預設最近 30 天",
  "loadEarlier": "載入更早 30 天",
  "errorNoData": "該日期無資料，最舊資料為 {oldest}",
  "statsBar": "顯示 {shown} / 載入 {loaded} / 全庫 {total}",
  "filterBar": {
    "searchPlaceholder": "全文搜尋（actor / action / resource / metadata）",
    "actorRoleAll": "所有角色",
    "actionPlaceholder": "action 前綴 e.g. kyc.",
    "actorPlaceholder": "actor (exact)",
    "resourcePlaceholder": "resource id (exact)",
    "windowStartLabel": "起",
    "windowEndLabel": "迄",
    "jumpDateLabel": "跳到",
    "jumpCta": "跳轉",
    "resetCta": "重設",
    "exportCsvCta": "匯出 CSV"
  },
  "detail": {
    "title": "詳情",
    "placeholder": "點選列表項目以查看詳情",
    "copyIdCta": "複製 id"
  }
}
```

英文版同步翻譯。

- [ ] **Step 9.2: 移除已停用 key**

舊 `admin.audit.title / subtitle / filterAllRole / ...` 中只有 inline-expand 對應的 `logId` 不再使用。檢查 audit 區塊中是否有舊 page 用、新 page 不再用的 key 並清掉（執行時用 `grep -rn "admin\.audit\.<oldkey>"` 確認）。

- [ ] **Step 9.3: 跑 i18n sync 測試**

```bash
npm test -- i18n-sync
```

Expected: PASS（zh-TW 與 en 結構一致）。若 fail 表示兩邊 key 沒對齊。

**Checkpoint:** 「feat(i18n): add admin.audit.stream namespace」

---

## Task 10: 全面驗證

- [ ] **Step 10.1: typecheck**

```bash
npm run typecheck
```

Expected: EXIT=0

- [ ] **Step 10.2: 全測試**

```bash
npm test
```

Expected: 所有測試通過（既有 24 + 新增 audit-window 4 + audit-seed 5 + useAuditStream 5 ≈ 38）

- [ ] **Step 10.3: build**

```bash
npm run build
```

Expected: build 成功，無 warning

- [ ] **Step 10.4: 手動驗證**

```bash
npm run preview
```

開啟 `/admin/audit`：

- 初始載入：30 天視窗、stats bar 顯示正確
- 捲動：流暢，無掉幀
- 點擊 row：右側 panel 顯示對應內容、URL 含 `?selected=<id>`
- 重新整理：deep-link 自動 select + scroll
- search：輸入後 300ms 才 filter
- jump-to-date：視窗內 / 視窗外 / 無資料 三條路徑
- loadEarlier：按鈕 disabled 期間正確
- CSV：下載檔內容正確、檔名含時戳
- mobile（DevTools < lg）：panel 從右滑入

- [ ] **Step 10.5: DOM row 數驗證**

DevTools Elements 計數虛擬列表內 `AuditStreamRow` 元素 — 應 ≤ 30（viewport + overscan 10×2）。

- [ ] **Step 10.6: 效能驗證**

DevTools Performance 抓 PageDown 連按 5 秒 — 主執行緒 60fps、無紅色長 task。

**Checkpoint:** 整個 feature 完成，等使用者放行批次 commit。

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Audit Log Filtering and Pagination → time window query only | Task 2 |
| Metadata JSON Expand → side panel | Task 7, 8 |
| Read-Only (No Mutations) — CSV allowed | Task 4 (`exportCsv`) |
| Virtualized Rendering | Task 8 (useVirtualizer) |
| Time Window Loading | Task 4 (`loadEarlier`) |
| Full-Text Search | Task 4 (filteredEntries), Task 5 (debounce) |
| Jump-to-Date | Task 4 (`jumpToDate`), Task 8 (toast on no-data) |
| CSV Export | Task 4 (`exportCsv`), Task 9 (i18n) |
| Selectable Entry Sharable URL | Task 8 (route sync) |
| Audit Mock Seed Scale | Task 3 |

**Placeholder scan:** 檢查無 TBD / TODO / "implement later"。

**Type consistency check:**
- `AuditFilters` 在 Task 4 定義，Task 5 (`AuditFilterBar`) 透過 `import type { AuditFilters } from '~/composables/useAuditStream'` 重用 — 一致
- `UseAuditStreamReturn` 公開的方法在 Task 8 page 全部用到 — 一致
- `jumpToDate` 回傳 union `{ index: number } | { error: 'no-data'; oldest: string | null }`，Task 8 的 `'error' in result` 判別正確

**Note：** 此計畫所有 "Checkpoint" 為**邏輯 commit 邊界**，但實際 `git commit` 動作依使用者指示「不要 commit」延後。
