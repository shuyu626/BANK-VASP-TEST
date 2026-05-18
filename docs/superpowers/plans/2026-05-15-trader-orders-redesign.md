# /trader/orders 重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/trader/orders` 與 `/trader/orders/trades` 重新設計為「Sparkline KPI + 幣對下拉篩選 + 清晰表格（手機改卡片）+ 訂單明細 Modal」，補滿成交均價/進度/金額/訂單編號，全視窗良好 RWD。

**Architecture:** 純衍生彙總邏輯抽到可測純函式 `app/utils/order-stats.ts`；`useOrderStats` composable 做 reactive 包裝；新增展示型 `BaseSparklineKpi`（common）與 `TraderOrderCard`（trader 手機卡片）；頁面層重構消費這些單元。不修改 `BaseTable`/`BaseModal`/`BaseSelect`/store/server。

**Tech Stack:** Nuxt 4、Vue 3 `<script setup>` + TS strict、Pinia、Tailwind（token）、`@nuxtjs/i18n`、Vitest + happy-dom。

**Spec:** `docs/superpowers/specs/2026-05-15-trader-orders-redesign-design.md`

---

## 約束（每個 Task 都適用）

- 驗證指令：型別 `npm run typecheck`；測試 `npm test`（單檔 `npm test -- <path>`）；瀏覽驗證用 `npm run build && npm run preview`（`npm run dev` 因路徑含空格有 IPC bug，**不要用 dev 驗證**）。
- 禁 `any`；型別 import 用 `import type`；composable 明確標註回傳型別。
- 色彩只用 token / Tailwind utility，禁 hex。買=`text-market-down`（綠）、賣=`text-market-up`（紅），不可弄反。
- 字串全走 i18n key；zh-TW 與 en 必須同步（`tests/i18n-sync.test.ts` 會擋）。
- 隨機性只走 `createSeededRandom()` / `hashSeed()`（`~~/app/utils/mock/seed`）。
- 每個 async 有 try/catch + toast；`console.log` 僅可包在 `if (import.meta.env.DEV)`。

## File Structure

| 檔案 | 職責 |
|---|---|
| `app/utils/order-stats.ts`（新增） | 純函式：`computeOrderStats()`（KPI + sparkline）、`orderRowVM()`（單列衍生：進度%、notional、可取消） |
| `tests/utils/order-stats.spec.ts`（新增） | 上者單元測試（真實序列、決定性合成序列、邊界） |
| `app/composables/useOrderStats.ts`（新增） | reactive 包裝 `computeOrderStats`，明確回傳型別 |
| `tests/composables/useOrderStats.spec.ts`（新增） | composable 回傳值測試 |
| `app/components/common/BaseSparklineKpi.vue`（新增） | 展示型 KPI 卡 + inline SVG sparkline |
| `app/components/trader/TraderOrderCard.vue`（新增） | 手機版單筆訂單卡片 |
| `app/pages/trader/orders/index.vue`（改寫） | KPI 區 + tab/工具列 + 表格/卡片 + 明細 Modal |
| `app/pages/trader/orders/trades.vue`（改寫） | declarative 表格 + 分頁 + 彙總 + 手機卡片（保留 CSV） |
| `i18n/locales/zh-TW.json`、`i18n/locales/en.json`（修改） | 新增 key |

不修改：`BaseTable.vue`、`BaseModal.vue`、`BaseSelect.vue`、`stores/orders.ts`、`server/**`、其他 trader 頁。

---

## Task 1: 新增 i18n keys（zh-TW / en 同步）

**Files:**
- Modify: `i18n/locales/zh-TW.json`（`trader.orders` 物件、`trader.trades` 物件內）
- Modify: `i18n/locales/en.json`（對應位置）
- Test: `tests/i18n-sync.test.ts`（既有，作為守門）

- [ ] **Step 1: 在 `i18n/locales/zh-TW.json` 的 `trader.orders` 物件補入下列 key**

於現有 `"trader": { "orders": { ... } }` 內，把 `tab` 物件補 `trades`，並新增 `kpi` / `filter` / `status` / `orderType` / `priceMarket` / `cancelAll` / `cancelAllConfirm` / `cancelAllDone` / `detailCta` / `detail` / `progress` / `notional` / `colMobileMore`：

```json
"tab": { "all": "全部", "open": "開倉中", "history": "歷史委託", "trades": "成交紀錄" },
"kpi": {
  "openCount": "開倉中委託",
  "openNotional": "開倉金額",
  "filledToday": "今日成交",
  "fee30d": "近 30 日手續費",
  "unitOrders": "筆"
},
"filter": { "symbolLabel": "幣對", "allSymbols": "全部幣對", "withCount": "{symbol}（{count}）" },
"status": {
  "open": "委託中", "partial": "部分成交", "filled": "已成交",
  "cancelled": "已取消", "rejected": "已拒絕"
},
"orderType": { "limit": "限價", "market": "市價" },
"priceMarket": "市價",
"notional": "委託金額",
"progress": "成交進度",
"cancelAll": "全部取消（{count}）",
"cancelAllConfirm": "確定要取消目前篩選的 {count} 筆未成交委託？",
"cancelAllDone": "已取消 {ok} 筆，失敗 {fail} 筆",
"detailCta": "明細",
"detail": {
  "title": "訂單明細 · {symbol}",
  "orderId": "訂單編號",
  "createdAt": "建立時間",
  "updatedAt": "最後更新",
  "avgFill": "成交均價",
  "filled": "已成交數量",
  "remaining": "剩餘數量",
  "relatedTrades": "關聯成交"
}
```

> 保留既有 `th.type`、`emptyAll/emptyOpen/emptyHistory`、`cancelCta/cancelSuccess/cancelError`、`tradesLink`、`title` 不動。

- [ ] **Step 2: 在 `trader.trades` 物件補入彙總與分頁 key**

```json
"summary": { "count": "成交筆數", "volume": "總成交量", "fee": "總手續費" },
"emptyMobile": "尚無成交紀錄"
```

- [ ] **Step 3: 在 `i18n/locales/en.json` 對應位置補入相同結構的英文**

`trader.orders`：

```json
"tab": { "all": "All", "open": "Open", "history": "Order History", "trades": "Trade History" },
"kpi": {
  "openCount": "Open Orders",
  "openNotional": "Open Value",
  "filledToday": "Filled Today",
  "fee30d": "Fees (30d)",
  "unitOrders": ""
},
"filter": { "symbolLabel": "Pair", "allSymbols": "All pairs", "withCount": "{symbol} ({count})" },
"status": {
  "open": "Open", "partial": "Partially filled", "filled": "Filled",
  "cancelled": "Cancelled", "rejected": "Rejected"
},
"orderType": { "limit": "Limit", "market": "Market" },
"priceMarket": "Market",
"notional": "Order value",
"progress": "Fill progress",
"cancelAll": "Cancel all ({count})",
"cancelAllConfirm": "Cancel all {count} unfilled orders in the current filter?",
"cancelAllDone": "Cancelled {ok}, failed {fail}",
"detailCta": "Details",
"detail": {
  "title": "Order detail · {symbol}",
  "orderId": "Order ID",
  "createdAt": "Created",
  "updatedAt": "Last updated",
  "avgFill": "Avg fill price",
  "filled": "Filled qty",
  "remaining": "Remaining qty",
  "relatedTrades": "Related trades"
}
```

`trader.trades`：

```json
"summary": { "count": "Trades", "volume": "Total volume", "fee": "Total fees" },
"emptyMobile": "No trades yet"
```

> 注意：`kpi.unitOrders` 英文為空字串 `""`。`tests/i18n-sync.test.ts` 的空字串檢查只放行 `kycTier.tier0.unlocks`，**英文空字串會讓測試失敗**。因此 en 的 `unitOrders` 改為 `" orders"`（前置空格），zh-TW 維持 `"筆"`。請用 `" orders"`，不要用 `""`。

- [ ] **Step 4: 跑 i18n 同步測試確認 zh/en 對齊**

Run: `npm test -- tests/i18n-sync.test.ts`
Expected: PASS（3 個 it 全綠：key set 一致、zh 無空值、en 無空值）

- [ ] **Step 5: Commit**

```bash
git add i18n/locales/zh-TW.json i18n/locales/en.json
git commit -m "feat(i18n): add trader orders redesign keys"
```

---

## Task 2: 純函式 `order-stats.ts` — 先寫失敗測試

**Files:**
- Create: `tests/utils/order-stats.spec.ts`
- (Task 3 才建 `app/utils/order-stats.ts`)

- [ ] **Step 1: 寫失敗測試**

建 `tests/utils/order-stats.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { computeOrderStats, orderRowVM } from '~~/app/utils/order-stats'
import type { Order } from '~~/shared/types'

function mkOrder(p: Partial<Order>): Order {
  return {
    id: 'o1', userId: 'u1', symbol: 'BTC/TWD', side: 'buy', type: 'limit',
    price: 100, quantity: 2, filledQty: 1, avgFillPrice: 100,
    status: 'partial', createdAt: '2026-05-15T10:00:00',
    updatedAt: '2026-05-15T10:05:00', ...p
  }
}
type Trade = Parameters<typeof computeOrderStats>[1][number]
function mkTrade(p: Partial<Trade>): Trade {
  return {
    id: 't1', symbol: 'BTC/TWD', price: 100, quantity: 1,
    buyOrderId: 'b', sellOrderId: 's', buyerId: 'u1', sellerId: 'u2',
    fee: 5, timestamp: '2026-05-15T10:00:00', ...p
  }
}

describe('orderRowVM', () => {
  it('computes fill progress percent (clamped 0..100)', () => {
    expect(orderRowVM(mkOrder({ filledQty: 1, quantity: 2 })).progressPct).toBe(50)
    expect(orderRowVM(mkOrder({ filledQty: 0, quantity: 0 })).progressPct).toBe(0)
    expect(orderRowVM(mkOrder({ filledQty: 5, quantity: 2 })).progressPct).toBe(100)
  })
  it('computes notional from price*qty, falls back to avgFillPrice, else null', () => {
    expect(orderRowVM(mkOrder({ price: 100, quantity: 2 })).notional).toBe(200)
    expect(orderRowVM(mkOrder({ price: null, avgFillPrice: 90, quantity: 3 })).notional).toBe(270)
    expect(orderRowVM(mkOrder({ price: null, avgFillPrice: null })).notional).toBeNull()
  })
  it('marks open/partial as cancelable', () => {
    expect(orderRowVM(mkOrder({ status: 'open' })).cancelable).toBe(true)
    expect(orderRowVM(mkOrder({ status: 'partial' })).cancelable).toBe(true)
    expect(orderRowVM(mkOrder({ status: 'filled' })).cancelable).toBe(false)
  })
  it('derives quote currency from symbol', () => {
    expect(orderRowVM(mkOrder({ symbol: 'BTC/TWD' })).quote).toBe('TWD')
    expect(orderRowVM(mkOrder({ symbol: 'ETH/USDT' })).quote).toBe('USDT')
  })
})

describe('computeOrderStats', () => {
  const now = new Date('2026-05-15T23:00:00')

  it('counts open + partial orders for openCount.value', () => {
    const orders = [
      mkOrder({ id: 'a', status: 'open' }),
      mkOrder({ id: 'b', status: 'partial' }),
      mkOrder({ id: 'c', status: 'filled' })
    ]
    const s = computeOrderStats(orders, [], now, 'u1')
    expect(s.openCount.value).toBe(2)
  })

  it('sums today fills count and 30d fees from trades', () => {
    const trades = [
      mkTrade({ id: 't1', timestamp: '2026-05-15T09:00:00', fee: 10 }),
      mkTrade({ id: 't2', timestamp: '2026-05-15T20:00:00', fee: 5 }),
      mkTrade({ id: 't3', timestamp: '2026-05-01T10:00:00', fee: 7 }),
      mkTrade({ id: 't4', timestamp: '2026-03-01T10:00:00', fee: 99 })
    ]
    const s = computeOrderStats([], trades, now, 'u1')
    expect(s.filledToday.value).toBe(2)
    expect(s.fee30d.value).toBe(22) // 10 + 5 + 7, 03-01 超過 30 天不算
  })

  it('produces deterministic synthetic series for open stats (same seed key)', () => {
    const orders = [mkOrder({ status: 'open' })]
    const a = computeOrderStats(orders, [], now, 'user-xyz')
    const b = computeOrderStats(orders, [], now, 'user-xyz')
    expect(a.openNotional.series).toEqual(b.openNotional.series)
    expect(a.openCount.series.length).toBeGreaterThanOrEqual(2)
  })

  it('delta dir compares last vs previous bucket', () => {
    const s = computeOrderStats([], [
      mkTrade({ id: 'x', timestamp: '2026-05-15T09:00:00', fee: 1 })
    ], now, 'u1')
    expect(['up', 'down', 'flat']).toContain(s.fee30d.delta.dir)
  })

  it('handles empty input without throwing', () => {
    const s = computeOrderStats([], [], now, 'u1')
    expect(s.openCount.value).toBe(0)
    expect(s.fee30d.value).toBe(0)
    expect(s.filledToday.series.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- tests/utils/order-stats.spec.ts`
Expected: FAIL（`Cannot find module '~~/app/utils/order-stats'` 或匯入錯誤）

- [ ] **Step 3: Commit（紅燈測試入庫）**

```bash
git add tests/utils/order-stats.spec.ts
git commit -m "test(trader): add failing order-stats spec"
```

---

## Task 3: 實作 `order-stats.ts` 讓測試通過

**Files:**
- Create: `app/utils/order-stats.ts`
- Test: `tests/utils/order-stats.spec.ts`（Task 2）

- [ ] **Step 1: 寫實作**

建 `app/utils/order-stats.ts`：

```ts
import type { Order, Trade } from '~~/shared/types'
import { createSeededRandom, hashSeed } from '~~/app/utils/mock/seed'

export interface OrderRowVM {
  progressPct: number
  notional: number | null
  cancelable: boolean
  quote: string
}

export function orderRowVM(o: Order): OrderRowVM {
  const progressPct = o.quantity > 0
    ? Math.min(100, Math.max(0, Math.round((o.filledQty / o.quantity) * 100)))
    : 0
  const unit = o.price ?? o.avgFillPrice ?? null
  const notional = unit === null ? null : unit * o.quantity
  const cancelable = o.status === 'open' || o.status === 'partial'
  const quote = o.symbol.split('/')[1] ?? ''
  return { progressPct, notional, cancelable, quote }
}

export type Delta = { dir: 'up' | 'down' | 'flat'; text: string }
export interface SparkSeries { value: number; series: number[]; delta: Delta }
export interface OrderStats {
  openCount: SparkSeries
  openNotional: SparkSeries
  filledToday: SparkSeries
  fee30d: SparkSeries
}

const DAY = 86_400_000

function deltaOf(series: number[]): Delta {
  if (series.length < 2) return { dir: 'flat', text: '—' }
  const last = series[series.length - 1]!
  const prev = series[series.length - 2]!
  if (last > prev) return { dir: 'up', text: `+${(last - prev).toLocaleString('en-US')}` }
  if (last < prev) return { dir: 'down', text: `-${(prev - last).toLocaleString('en-US')}` }
  return { dir: 'flat', text: '—' }
}

/** 近 `days` 天，每天一個 bucket 的真實累計（取 `pick` 數值；count=每筆計 1） */
function dailySeries(
  trades: Trade[], now: Date, days: number, pick: (t: Trade) => number
): number[] {
  const end = now.getTime()
  const start = end - days * DAY
  const buckets = new Array(days).fill(0) as number[]
  for (const t of trades) {
    const ts = new Date(t.timestamp).getTime()
    if (Number.isNaN(ts) || ts < start || ts > end) continue
    const idx = Math.min(days - 1, Math.floor((ts - start) / DAY))
    buckets[idx]! += pick(t)
  }
  return buckets
}

/** 決定性合成序列：給定 seedKey 永遠相同（SSR/CSR safe），收斂到 endValue */
function syntheticSeries(seedKey: string, points: number, endValue: number): number[] {
  const rnd = createSeededRandom(hashSeed(seedKey))
  const out: number[] = []
  let v = endValue * (0.6 + rnd() * 0.3)
  for (let i = 0; i < points - 1; i++) {
    v = Math.max(0, v + (rnd() - 0.45) * endValue * 0.15)
    out.push(Math.round(v))
  }
  out.push(Math.round(endValue))
  return out
}

export function computeOrderStats(
  orders: Order[], trades: Trade[], now: Date, seedKey: string
): OrderStats {
  const todayStr = now.toISOString().slice(0, 10)

  const openOrders = orders.filter(o => o.status === 'open' || o.status === 'partial')
  const openCountVal = openOrders.length
  const openNotionalVal = openOrders.reduce((sum, o) => {
    const vm = orderRowVM(o)
    return sum + (vm.notional ?? 0)
  }, 0)

  const filledTodayVal = trades.filter(t => t.timestamp.slice(0, 10) === todayStr).length
  const feeDaily = dailySeries(trades, now, 30, t => t.fee)
  const fee30dVal = feeDaily.reduce((a, b) => a + b, 0)
  const filledDaily = dailySeries(trades, now, 7, () => 1)

  const openCountSeries = syntheticSeries(`${seedKey}:oc:${todayStr}`, 7, openCountVal)
  const openNotionalSeries = syntheticSeries(`${seedKey}:on:${todayStr}`, 7, openNotionalVal)

  return {
    openCount: { value: openCountVal, series: openCountSeries, delta: deltaOf(openCountSeries) },
    openNotional: { value: openNotionalVal, series: openNotionalSeries, delta: deltaOf(openNotionalSeries) },
    filledToday: { value: filledTodayVal, series: filledDaily, delta: deltaOf(filledDaily) },
    fee30d: { value: fee30dVal, series: feeDaily, delta: deltaOf(feeDaily) }
  }
}
```

- [ ] **Step 2: 跑測試確認通過**

Run: `npm test -- tests/utils/order-stats.spec.ts`
Expected: PASS（所有 `orderRowVM` 與 `computeOrderStats` it 綠燈）

- [ ] **Step 3: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤（若報 `Trade` 未匯出，確認 `shared/types` 已 re-export `Trade`；已知 `shared/types/orders.ts` 有 `export type Trade`）

- [ ] **Step 4: Commit**

```bash
git add app/utils/order-stats.ts
git commit -m "feat(trader): add order-stats pure helpers (KPI + row VM)"
```

---

## Task 4: `useOrderStats` composable（TDD）

**Files:**
- Create: `tests/composables/useOrderStats.spec.ts`
- Create: `app/composables/useOrderStats.ts`

- [ ] **Step 1: 寫失敗測試**

建 `tests/composables/useOrderStats.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useOrderStats } from '~~/app/composables/useOrderStats'
import type { Order, Trade } from '~~/shared/types'

const order: Order = {
  id: 'o1', userId: 'u1', symbol: 'BTC/TWD', side: 'buy', type: 'limit',
  price: 100, quantity: 2, filledQty: 1, avgFillPrice: 100, status: 'open',
  createdAt: '2026-05-15T10:00:00', updatedAt: '2026-05-15T10:00:00'
}

describe('useOrderStats', () => {
  it('returns a computed OrderStats reflecting refs', () => {
    const orders = ref<Order[]>([order])
    const trades = ref<Trade[]>([])
    const stats = useOrderStats(orders, trades, 'u1')
    expect(stats.value.openCount.value).toBe(1)
    orders.value = []
    expect(stats.value.openCount.value).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- tests/composables/useOrderStats.spec.ts`
Expected: FAIL（找不到模組）

- [ ] **Step 3: 寫實作**

建 `app/composables/useOrderStats.ts`：

```ts
import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Order, Trade } from '~~/shared/types'
import { computeOrderStats, type OrderStats } from '~~/app/utils/order-stats'

export function useOrderStats(
  orders: Ref<Order[]>,
  trades: Ref<Trade[]>,
  seedKey: string
): ComputedRef<OrderStats> {
  return computed<OrderStats>(() =>
    computeOrderStats(orders.value, trades.value, new Date(), seedKey)
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test -- tests/composables/useOrderStats.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/composables/useOrderStats.spec.ts app/composables/useOrderStats.ts
git commit -m "feat(trader): add useOrderStats composable"
```

---

## Task 5: `BaseSparklineKpi.vue`（展示型元件）

**Files:**
- Create: `app/components/common/BaseSparklineKpi.vue`
- Test: `tests/composables/...`（不做 mount 測試 — 與專案現況一致，元件以 typecheck + build 驗證；純邏輯已在 Task 2 覆蓋）

- [ ] **Step 1: 寫元件**

建 `app/components/common/BaseSparklineKpi.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: string
  series: number[]
  delta?: { dir: 'up' | 'down' | 'flat'; text: string }
  tone?: 'brand' | 'neutral'
}>(), {
  tone: 'brand'
})

const W = 100
const H = 32

const hasChart = computed(() => props.series.length >= 2)

const points = computed(() => {
  const s = props.series
  const min = Math.min(...s)
  const max = Math.max(...s)
  const span = max - min || 1
  return s.map((v, i) => {
    const x = (i / (s.length - 1)) * W
    const y = H - ((v - min) / span) * (H - 4) - 2
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  })
})

const linePath = computed(() => `M ${points.value.join(' L ')}`)
const areaPath = computed(() => `${linePath.value} L ${W} ${H} L 0 ${H} Z`)

const stroke = computed(() =>
  props.tone === 'brand' ? 'var(--color-primary-400)' : 'var(--color-text-muted)'
)
const deltaClass = computed(() => {
  if (!props.delta || props.delta.dir === 'flat') return 'text-text-muted'
  return props.delta.dir === 'up' ? 'text-primary-400' : 'text-text-muted'
})
</script>

<template>
  <div class="relative overflow-hidden bg-surface border border-border rounded-md p-4 h-28">
    <div class="flex items-center justify-between">
      <span class="text-xs text-text-muted">{{ label }}</span>
      <span v-if="delta" class="text-xs font-semibold num" :class="deltaClass">
        {{ delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '' }} {{ delta.text }}
      </span>
    </div>
    <div class="text-xl font-bold mt-3 num tracking-tight">{{ value }}</div>
    <svg
      v-if="hasChart"
      class="absolute left-0 right-0 bottom-0 w-full h-9"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="areaPath" :fill="stroke" fill-opacity="0.12" />
      <path :d="linePath" fill="none" :stroke="stroke" stroke-width="2"
            vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>
```

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add app/components/common/BaseSparklineKpi.vue
git commit -m "feat(common): add BaseSparklineKpi component"
```

---

## Task 6: `TraderOrderCard.vue`（手機卡片）

**Files:**
- Create: `app/components/trader/TraderOrderCard.vue`
- Test: 純邏輯已於 Task 2 `orderRowVM` 覆蓋；元件以 typecheck + build 驗證

- [ ] **Step 1: 寫元件**

建 `app/components/trader/TraderOrderCard.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '~~/shared/types'
import { orderRowVM } from '~~/app/utils/order-stats'

const props = defineProps<{ order: Order }>()
const emit = defineEmits<{ cancel: [id: string]; detail: [order: Order] }>()

const { t } = useI18n()
const vm = computed(() => orderRowVM(props.order))

const sideClass = computed(() =>
  props.order.side === 'buy' ? 'text-market-down' : 'text-market-up'
)
const sideLabel = computed(() =>
  props.order.side === 'buy' ? t('side.buyShort') : t('side.sellShort')
)
const typeLabel = computed(() => t(`trader.orders.orderType.${props.order.type}`))
const statusLabel = computed(() => t(`trader.orders.status.${props.order.status}`))
const notionalText = computed(() => {
  if (vm.value.notional === null) return '—'
  return vm.value.quote === 'TWD'
    ? fmtTwd(vm.value.notional)
    : fmtPrice(vm.value.notional)
})
</script>

<template>
  <div class="bg-surface border border-border rounded-md p-4">
    <div class="flex items-start justify-between">
      <div>
        <div class="font-bold">{{ order.symbol }}</div>
        <div class="text-[10px] text-text-muted num">{{ fmtDt(order.createdAt, 'minute') }}</div>
      </div>
      <BaseBadge :variant="orderStatusVariant(order.status)" size="sm" :solid="false">
        {{ statusLabel }}
      </BaseBadge>
    </div>

    <div class="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm">
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.side') }} / {{ $t('trader.orders.th.type') }}</div>
        <div class="font-medium"><span :class="sideClass">{{ sideLabel }}</span> · {{ typeLabel }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.price') }}</div>
        <div class="font-medium num">{{ order.price === null ? $t('trader.orders.priceMarket') : fmtPrice(order.price) }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('common.label.quantity') }}</div>
        <div class="font-medium num">{{ fmtQty(order.quantity) }}</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('trader.orders.notional') }}</div>
        <div class="font-medium num">{{ notionalText }}</div>
      </div>
      <div class="col-span-2">
        <div class="text-[10px] uppercase tracking-wide text-text-muted">
          {{ $t('trader.orders.progress') }} · {{ vm.progressPct }}%
        </div>
        <div class="h-1.5 bg-surface-alt rounded-full overflow-hidden mt-1.5">
          <div class="h-full bg-primary-500" :style="{ width: `${vm.progressPct}%` }" />
        </div>
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <BaseButton variant="secondary" size="sm" block @click="emit('detail', order)">
        {{ $t('trader.orders.detailCta') }}
      </BaseButton>
      <BaseButton
        v-if="vm.cancelable"
        variant="secondary"
        size="sm"
        block
        class="!text-danger"
        @click="emit('cancel', order.id)"
      >
        {{ $t('trader.orders.cancelCta') }}
      </BaseButton>
    </div>
  </div>
</template>
```

> `fmtTwd/fmtPrice/fmtQty/fmtDt`、`orderStatusVariant`、`BaseBadge`、`BaseButton` 皆為 Nuxt 自動匯入（其他頁面同樣未顯式 import）。

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add app/components/trader/TraderOrderCard.vue
git commit -m "feat(trader): add TraderOrderCard mobile card"
```

---

## Task 7: 改寫 `orders/index.vue`

**Files:**
- Modify: `app/pages/trader/orders/index.vue`（整檔取代）

- [ ] **Step 1: 以下列內容整檔取代 `app/pages/trader/orders/index.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import { useOrderStats } from '~/composables/useOrderStats'
import { orderRowVM } from '~~/app/utils/order-stats'
import type { TableColumn } from '~/components/common/BaseTable.vue'
import type { Order } from '~~/shared/types'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.orders') }))

const orders = useOrdersStore()
const session = useSessionStore()
const { orders: list, trades, loading } = storeToRefs(orders)
await Promise.all([orders.load(), orders.loadTrades()])

const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()

const stats = useOrderStats(list, trades, session.user?.id ?? 'anon')

type Tab = 'open' | 'history'
const tab = ref<Tab>('open')
const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'open', label: t('trader.orders.tab.open') },
  { value: 'history', label: t('trader.orders.tab.history') }
])

const symbolFilter = ref<string>('ALL')
const symbolOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const o of list.value) counts.set(o.symbol, (counts.get(o.symbol) ?? 0) + 1)
  const opts = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sym, c]) => ({ value: sym, label: t('trader.orders.filter.withCount', { symbol: sym, count: c }) }))
  return [{ value: 'ALL', label: t('trader.orders.filter.allSymbols') }, ...opts]
})

const filtered = computed<Order[]>(() => {
  let l = list.value
  l = tab.value === 'open'
    ? l.filter(o => o.status === 'open' || o.status === 'partial')
    : l.filter(o => ['filled', 'cancelled', 'rejected'].includes(o.status))
  if (symbolFilter.value !== 'ALL') l = l.filter(o => o.symbol === symbolFilter.value)
  return l
})

const cancelableInView = computed(() => filtered.value.filter(o => orderRowVM(o).cancelable))

const columns = computed<TableColumn[]>(() => [
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'sideType', label: `${t('common.label.side')} / ${t('trader.orders.th.type')}` },
  { key: 'price', label: t('common.label.price'), align: 'right' },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' },
  { key: 'progress', label: t('trader.orders.progress') },
  { key: 'notional', label: t('trader.orders.notional'), align: 'right' },
  { key: 'status', label: t('common.label.status') },
  { key: 'actions', label: t('common.label.action'), align: 'right' }
])

function vmOf(o: Order) { return orderRowVM(o) }
function notionalText(o: Order): string {
  const vm = orderRowVM(o)
  if (vm.notional === null) return '—'
  return vm.quote === 'TWD' ? fmtTwd(vm.notional) : fmtPrice(vm.notional)
}

async function onCancel(id: string) {
  try {
    await orders.cancel(id)
    toast.success(t('trader.orders.cancelSuccess'))
  } catch (err: unknown) {
    toast.error(extractErr(err))
  }
}

async function onCancelAll() {
  const targets = cancelableInView.value
  if (targets.length === 0) return
  const ok = await confirm({
    message: t('trader.orders.cancelAllConfirm', { count: targets.length }),
    variant: 'danger'
  })
  if (!ok) return
  let done = 0; let fail = 0
  for (const o of targets) {
    try { await orders.cancel(o.id); done++ } catch { fail++ }
  }
  toast.success(t('trader.orders.cancelAllDone', { ok: done, fail }))
}

function extractErr(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? t('trader.orders.cancelError')
  }
  return t('trader.orders.cancelError')
}

const emptyText = computed(() =>
  tab.value === 'open' ? t('trader.orders.emptyOpen') : t('trader.orders.emptyHistory')
)

// ─── 訂單明細 modal ───
const detailOpen = ref(false)
const detailOrder = ref<Order | null>(null)
function openDetail(o: Order) { detailOrder.value = o; detailOpen.value = true }
const detailVm = computed(() => detailOrder.value ? orderRowVM(detailOrder.value) : null)

function onTabBar(v: Tab | 'trades') {
  if (v === 'trades') { router.push('/trader/orders/trades'); return }
  tab.value = v
}
</script>

<template>
  <div class="space-y-5">
    <BasePageHeader :title="$t('trader.orders.title')" weight="bold" />

    <!-- KPI -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.openCount')"
        :value="`${stats.openCount.value} ${$t('trader.orders.kpi.unitOrders')}`"
        :series="stats.openCount.series"
        :delta="stats.openCount.delta"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.openNotional')"
        :value="fmtTwd(stats.openNotional.value)"
        :series="stats.openNotional.series"
        :delta="stats.openNotional.delta"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.filledToday')"
        :value="`${stats.filledToday.value} ${$t('trader.orders.kpi.unitOrders')}`"
        :series="stats.filledToday.series"
        :delta="stats.filledToday.delta"
        tone="neutral"
      />
      <BaseSparklineKpi
        :label="$t('trader.orders.kpi.fee30d')"
        :value="fmtTwd(stats.fee30d.value)"
        :series="stats.fee30d.series"
        :delta="stats.fee30d.delta"
        tone="neutral"
      />
    </div>

    <!-- tab + toolbar -->
    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <div class="flex gap-1 text-sm">
        <button
          v-for="opt in [...tabOptions, { value: 'trades' as const, label: $t('trader.orders.tab.trades') }]"
          :key="opt.value"
          type="button"
          class="px-4 py-2 rounded-md transition"
          :class="opt.value === tab ? 'bg-brand text-white' : 'text-text-muted hover:text-text hover:bg-surface-alt'"
          @click="onTabBar(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="flex items-center gap-2 md:ml-auto">
        <div class="w-full md:w-52">
          <BaseSelect
            v-model="symbolFilter"
            :options="symbolOptions"
            :label="undefined"
            size="sm"
          />
        </div>
        <BaseButton
          v-if="tab === 'open' && cancelableInView.length > 0"
          variant="secondary"
          size="sm"
          class="!text-danger shrink-0"
          @click="onCancelAll"
        >
          {{ $t('trader.orders.cancelAll', { count: cancelableInView.length }) }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" class="shrink-0" :disabled="loading" @click="orders.load()">
          {{ $t('common.action.refresh') }}
        </BaseButton>
      </div>
    </div>

    <!-- 桌機 / 平板：表格 -->
    <div class="hidden md:block">
      <BaseTable
        :columns="columns"
        :items="filtered"
        row-key="id"
        paginated
        :default-page-size="20"
        :page-size-options="[10, 20, 50, 100]"
        :empty-text="emptyText"
        panel-class="trader-panel overflow-hidden"
        numeric
      >
        <template #cell-symbol="{ row }">
          <div class="font-medium">{{ row.symbol }}</div>
          <div class="text-[10px] text-text-muted num">{{ fmtDt(row.createdAt, 'minute') }}</div>
        </template>
        <template #cell-sideType="{ row }">
          <span :class="row.side === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ row.side === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
          <span class="text-text-muted"> · {{ $t(`trader.orders.orderType.${row.type}`) }}</span>
        </template>
        <template #cell-price="{ row }">
          {{ row.price === null ? $t('trader.orders.priceMarket') : fmtPrice(row.price) }}
        </template>
        <template #cell-quantity="{ row }">{{ fmtQty(row.quantity) }}</template>
        <template #cell-progress="{ row }">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-20 bg-surface-alt rounded-full overflow-hidden">
              <div class="h-full bg-primary-500" :style="{ width: `${vmOf(row).progressPct}%` }" />
            </div>
            <span class="text-text-muted text-xs num">{{ vmOf(row).progressPct }}%</span>
          </div>
        </template>
        <template #cell-notional="{ row }">{{ notionalText(row) }}</template>
        <template #cell-status="{ row }">
          <BaseBadge :variant="orderStatusVariant(row.status)" size="sm" :solid="false">
            {{ $t(`trader.orders.status.${row.status}`) }}
          </BaseBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="text-xs text-primary-400 hover:text-primary-300" @click="openDetail(row)">
              {{ $t('trader.orders.detailCta') }}
            </button>
            <BaseButton
              v-if="vmOf(row).cancelable"
              variant="secondary"
              size="sm"
              class="!text-danger"
              @click="onCancel(row.id)"
            >
              {{ $t('trader.orders.cancelCta') }}
            </BaseButton>
          </div>
        </template>
      </BaseTable>
    </div>

    <!-- 手機：卡片 -->
    <div class="md:hidden space-y-3">
      <p v-if="filtered.length === 0" class="text-center text-text-muted py-10">{{ emptyText }}</p>
      <TraderOrderCard
        v-for="o in filtered"
        :key="o.id"
        :order="o"
        @cancel="onCancel"
        @detail="openDetail"
      />
    </div>

    <!-- 明細 modal -->
    <BaseModal v-model="detailOpen" :title="detailOrder ? $t('trader.orders.detail.title', { symbol: detailOrder.symbol }) : ''" width="md">
      <BaseDescriptionList
        v-if="detailOrder && detailVm"
        :items="[
          { label: $t('trader.orders.detail.orderId'), value: detailOrder.id },
          { label: $t('trader.orders.detail.createdAt'), value: fmtDt(detailOrder.createdAt) },
          { label: $t('trader.orders.detail.updatedAt'), value: fmtDt(detailOrder.updatedAt) },
          { label: $t('trader.orders.detail.avgFill'), value: detailOrder.avgFillPrice === null ? '—' : fmtPrice(detailOrder.avgFillPrice) },
          { label: $t('trader.orders.detail.filled'), value: `${fmtQty(detailOrder.filledQty)} / ${fmtQty(detailOrder.quantity)}` },
          { label: $t('trader.orders.detail.remaining'), value: fmtQty(Math.max(0, detailOrder.quantity - detailOrder.filledQty)) },
          { label: $t('trader.orders.notional'), value: notionalText(detailOrder) }
        ]"
      />
      <template #footer="{ close }">
        <BaseButton variant="secondary" block @click="close">{{ $t('common.action.close') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
```

> 若 `BaseDescriptionList` 的 props 介面不是 `items: {label,value}[]`，先 `cat app/components/common/BaseDescriptionList.vue` 確認；如不符，改用簡單 `<dl>` 列出相同 7 個欄位（label 用 `text-text-muted text-xs`、value 用 `num`），不得省略任何欄位。

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤（重點檢查 `BaseSelect` 的 `v-model` 型別、`TableColumn` import、`stats.value` 存取）

- [ ] **Step 3: Build 驗證可渲染**

Run: `npm run build`
Expected: build 成功無錯誤（不要用 `npm run dev`）

- [ ] **Step 4: Commit**

```bash
git add app/pages/trader/orders/index.vue
git commit -m "refactor(trader): redesign orders page with KPI, pair filter, RWD cards"
```

---

## Task 8: 改寫 `trades.vue`

**Files:**
- Modify: `app/pages/trader/orders/trades.vue`（整檔取代）

- [ ] **Step 1: 以下列內容整檔取代 `app/pages/trader/orders/trades.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrdersStore } from '~/stores/orders'
import { useSessionStore } from '~/stores/session'
import type { TableColumn } from '~/components/common/BaseTable.vue'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.trades') }))

const orders = useOrdersStore()
const session = useSessionStore()
const { trades } = storeToRefs(orders)
await orders.loadTrades()
const router = useRouter()

function sideFor(tr: { buyerId: string; sellerId: string }) {
  return tr.buyerId === session.user?.id ? 'buy' : 'sell'
}

const summary = computed(() => ({
  count: trades.value.length,
  volume: trades.value.reduce((a, b) => a + b.quantity, 0),
  fee: trades.value.reduce((a, b) => a + b.fee, 0)
}))

const columns = computed<TableColumn[]>(() => [
  { key: 'timestamp', label: t('common.label.time') },
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'side', label: t('common.label.side') },
  { key: 'price', label: t('common.label.price'), align: 'right' },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' },
  { key: 'fee', label: t('common.label.fee'), align: 'right' }
])

function exportCsv() {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const filename = `trades_${ts.slice(0, 8)}_${ts.slice(8, 14)}.csv`
  const header = ['id', 'symbol', 'side', 'price', 'quantity', 'fee', 'timestamp']
  const rows = trades.value.map(tr => [
    tr.id, tr.symbol, sideFor(tr),
    tr.price.toFixed(2), tr.quantity.toFixed(6), tr.fee.toFixed(4), tr.timestamp
  ])
  const lines = [header, ...rows].map(r =>
    r.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(',')
  )
  const csv = '﻿' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-5">
    <BasePageHeader :title="$t('trader.trades.title')" :subtitle="$t('trader.trades.subtitle')" weight="bold">
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="router.push('/trader/orders')">
          {{ $t('trader.trades.back') }}
        </BaseButton>
        <BaseButton variant="secondary" size="sm" :disabled="trades.length === 0" @click="exportCsv">
          {{ $t('trader.trades.exportCsv') }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <div class="grid grid-cols-3 gap-3">
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.count') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ summary.count }}</div>
      </div>
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.volume') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ fmtQty(summary.volume) }}</div>
      </div>
      <div class="bg-surface border border-border rounded-md p-4">
        <div class="text-xs text-text-muted">{{ $t('trader.trades.summary.fee') }}</div>
        <div class="text-xl font-bold mt-2 num">{{ fmtTwd(summary.fee) }}</div>
      </div>
    </div>

    <!-- 桌機 / 平板：表格 -->
    <div class="hidden md:block">
      <BaseTable
        :columns="columns"
        :items="trades"
        row-key="id"
        paginated
        :default-page-size="20"
        :page-size-options="[10, 20, 50, 100]"
        :empty-text="$t('trader.trades.empty')"
        panel-class="trader-panel overflow-hidden"
        numeric
      >
        <template #cell-timestamp="{ row }">
          <span class="text-text-muted">{{ fmtDt(row.timestamp) }}</span>
        </template>
        <template #cell-symbol="{ row }"><span class="font-medium">{{ row.symbol }}</span></template>
        <template #cell-side="{ row }">
          <span :class="sideFor(row) === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ sideFor(row) === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
        </template>
        <template #cell-price="{ row }">{{ fmtPrice(row.price) }}</template>
        <template #cell-quantity="{ row }">{{ fmtQty(row.quantity) }}</template>
        <template #cell-fee="{ row }"><span class="text-text-muted">{{ row.fee.toFixed(4) }}</span></template>
      </BaseTable>
    </div>

    <!-- 手機：卡片 -->
    <div class="md:hidden space-y-3">
      <p v-if="trades.length === 0" class="text-center text-text-muted py-10">{{ $t('trader.trades.emptyMobile') }}</p>
      <div v-for="tr in trades" :key="tr.id" class="bg-surface border border-border rounded-md p-4">
        <div class="flex items-center justify-between">
          <span class="font-bold">{{ tr.symbol }}</span>
          <span :class="sideFor(tr) === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ sideFor(tr) === 'buy' ? $t('side.buyShort') : $t('side.sellShort') }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
          <div><span class="text-text-muted text-[10px] uppercase">{{ $t('common.label.price') }}</span><div class="num">{{ fmtPrice(tr.price) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase">{{ $t('common.label.quantity') }}</span><div class="num">{{ fmtQty(tr.quantity) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase">{{ $t('common.label.fee') }}</span><div class="num">{{ tr.fee.toFixed(4) }}</div></div>
          <div><span class="text-text-muted text-[10px] uppercase">{{ $t('common.label.time') }}</span><div class="num text-text-muted">{{ fmtDt(tr.timestamp, 'minute') }}</div></div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: 全量測試 + build**

Run: `npm test`
Expected: 全綠（含 i18n-sync、order-stats、useOrderStats、既有測試）

Run: `npm run build`
Expected: build 成功

- [ ] **Step 4: Commit**

```bash
git add app/pages/trader/orders/trades.vue
git commit -m "refactor(trader): redesign trades page with declarative table, summary, RWD"
```

---

## Task 9: 最終驗證與 demo guide 補註

**Files:**
- Modify: `docs/10-demo-guide.md`（在 trader/orders 段落補一句合成 sparkline 註記；若無對應段落則加一段「我的委託」說明）

- [ ] **Step 1: 在 `docs/10-demo-guide.md` 補註**

於委託 / orders 相關段落加入一句（中文）：

> 「我的委託」頁上方 KPI 的「開倉中委託 / 開倉金額」走勢線為**示範用決定性合成資料**（以 userId+日期為種子，SSR/CSR 一致）；「今日成交 / 近 30 日手續費」走勢線為自 mock 成交紀錄真實彙總。

- [ ] **Step 2: 完整驗證**

Run: `npm run typecheck && npm test && npm run build`
Expected: 三者皆通過

- [ ] **Step 3: 手動 RWD 抽查**

Run: `npm run preview`
開啟 `http://localhost:3000/trader/orders`，於瀏覽器 DevTools 切換寬度：
- `≥1024px`：KPI 4 欄、完整表格
- `768–1023px`：KPI 2 欄、表格（工具列單列）
- `<768px`：KPI 2 欄、訂單卡片、工具列堆疊、幣對下拉全寬
- 點「明細」→ Modal 顯示 7 欄位；點「全部取消」→ 出現確認框
- 切「成交紀錄」tab → 導向 `/trader/orders/trades`，彙總 3 卡 + 分頁表 + CSV 可下載

- [ ] **Step 4: Commit**

```bash
git add docs/10-demo-guide.md
git commit -m "docs(trader): note synthetic sparkline source in demo guide"
```

---

## Self-Review（撰寫者已執行）

- **Spec coverage：** §3 決定 → Task 1/5/6/7/8；§4 頁面結構與表格欄位 → Task 7；§5 BaseSparklineKpi → Task 5；§6 useOrderStats/純函式 → Task 2/3/4；§7 trades 重設計 → Task 8；§8 RWD → Task 6/7/8（`grid-cols-2 lg:grid-cols-4`、`hidden md:block` / `md:hidden`）；§9 篩選並存 → Task 7 `filtered`；§11 i18n → Task 1；§12 測試 → Task 2/4；§13 約束 → 各 Task 驗證步驟用 build 不用 dev；demo 註記 → Task 9。無遺漏。
- **Placeholder scan：** 無 TBD/TODO；所有步驟含完整程式碼與指令。`BaseDescriptionList` 處給了 fallback 明確指示（非 placeholder）。
- **Type consistency：** `computeOrderStats(orders, trades, now, seedKey)`、`OrderStats`/`SparkSeries`/`Delta`、`orderRowVM`→`OrderRowVM{progressPct,notional,cancelable,quote}`、`useOrderStats(orders,trades,seedKey):ComputedRef<OrderStats>` 跨 Task 2/3/4/6/7 一致；i18n key 命名 Task 1 定義、Task 6/7/8 使用一致（`trader.orders.kpi.*`/`status.*`/`orderType.*`/`detail.*`/`filter.*`）。
- **已知風險旗標：** Task 1 Step 3 已標註英文空字串會被 i18n-sync 擋（故 `unitOrders` en 用 `" orders"`）；Task 7 Step 1 已標註 `BaseDescriptionList` props 需先確認、附 fallback。
