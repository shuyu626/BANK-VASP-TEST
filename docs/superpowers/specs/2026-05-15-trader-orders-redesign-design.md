# /trader/orders 重新設計 — 設計規格

- 日期：2026-05-15
- 狀態：草案（待使用者審查）
- 範圍：trader 端 `/trader/orders` 與 `/trader/orders/trades` 兩頁的 UI/UX 重新設計
- 方法論：Superpowers brainstorming → 本文件 → writing-plans → 實作

---

## 1. 背景與問題

`/trader/orders` 是交易所前台的「我的委託 / 成交紀錄」。現況問題（依交易所訂單頁慣例盤點）：

- `Order.avgFillPrice`（成交均價）存在型別但**完全沒顯示**。
- `filledQty` 只是裸數字，沒有成交進度視覺化；沒有委託金額（price×qty）。
- 沒有訂單編號 / 時間戳的可追溯呈現（本專案是給銀行 PM / 合規主管看的 demo，追溯性重要）。
- `status` / `type` 直接顯示原始英文字串，未走 i18n。
- 沒有總覽 KPI、沒有篩選。
- `trades.vue` 仍是舊 `<slot name="head">` 模式、無分頁、無彙總。
- 沒有「全部取消」操作。
- 兩頁 RWD 僅靠 `BaseTable` 的橫向捲動，窄螢幕體驗差。

## 2. 目標與非目標

### 目標
- **功能 + 視覺並重**：補滿被埋沒的訂單資料，同時大幅提升視覺品質，且要在 demo 場景對非技術聽眾清楚說故事。
- 全視窗良好 RWD 體驗（手機 / 平板 / 桌機）。
- 完全沿用既有 token 系統、Base 元件、i18n、台灣紅漲綠跌慣例。
- 建立可日後複用到其他 trader 頁的版型 pattern（本次只實作於 orders）。

### 非目標（明確排除，不在本次範圍）
- 不把此版型推展到 `wallet` / `markets` / `trade` 等其他 trader 頁（之後另開 change）。
- 不修改跨頁共用元件 `BaseTable` / `BaseModal` 的內部結構或新增「可展開列」能力。
- 不新增後端 endpoint；沿用既有 `/api/trader/orders` 與 `/api/trader/orders/trades`。
- 不做即時 polling／WebSocket。
- admin / bank 端不受影響。

## 3. 已確認的設計決定（經視覺腦力激盪逐項核可）

| 項目 | 決定 |
|---|---|
| 整體方向 | **方向 B — KPI 卡 + 清晰表格**（非密集交易所主控台、非最小打磨） |
| KPI 卡樣式 | **樣式 2 — Sparkline 趨勢卡**（背景藏趨勢線 + 右上漲跌 chip） |
| RWD 表格 | `md` 以上用 `BaseTable`；`< md` 改用新元件 `TraderOrderCard` 卡片清單（同一資料源） |
| 幣對篩選 | 以既有 `BaseSelect`（原生 select）下拉**取代自由文字搜尋**；選項 = 全部幣對 + 訂單去重幣對 |
| 訂單明細 | 以既有 `BaseModal`（置中對話框，手機近全寬）呈現；不自造 bottom-sheet |
| 分頁/路由 | `/trader/orders` 含「開倉中 / 歷史委託」兩 tab；「成交紀錄」為第 3 個 tab，點擊導向既有獨立路由 `/trader/orders/trades` |

### 與 mockup 的誠實落差修正
- 視覺 mockup 的幣對下拉是自製 popover；實作以 `BaseSelect`（原生 `<select>`）呈現，每幣對筆數寫進 option 文字（例：`BTC/TWD (3)`）。
- 視覺 mockup 的手機明細是 bottom-sheet；實作沿用 `BaseModal`（置中、手機 `w-full` 近全寬），不對共用元件動刀。

## 4. 頁面結構 — `/trader/orders/index.vue`

由上而下：

1. **頁首** `BasePageHeader`（`weight="bold"`，title=`我的委託`，副標說明為示範資料）。
2. **KPI 區**：4 張 `BaseSparklineKpi`
   - 開倉中委託（筆數）
   - 開倉金額（NT$，所有開倉/部分成交委託的 price×剩餘量估值）
   - 今日成交（筆數）
   - 近 30 日手續費（NT$）
3. **Tab + 工具列**（同一列，桌機）：
   - 左：`BaseTabBar` — `開倉中` / `歷史委託` / `成交紀錄`（第 3 個切換時 `router.push('/trader/orders/trades')`）
   - 右：幣對 `BaseSelect` ＋「全部取消」`BaseButton`（僅開倉中 tab、有可取消單時顯示）＋「刷新」`BaseButton`（ghost）
4. **資料區**：
   - `md` 以上：`BaseTable`（declarative columns + `#cell-*` slot + 內建分頁）
   - `< md`：`TraderOrderCard` 卡片清單（v-for 同一份 `filtered`），自帶簡易分頁或「載入更多」
5. **訂單明細 `BaseModal`**：點「明細」開啟，顯示訂單編號、建立/更新時間、成交均價、已成交/剩餘數量、已付手續費、關聯成交連結。

### 表格欄位（開倉中 / 歷史委託）

| 欄 | 內容 / 處理 |
|---|---|
| 幣對 | icon + symbol + 建立時間（小字） |
| 方向 / 類型 | 買=`text-market-down`（綠）、賣=`text-market-up`（紅）；類型走 i18n（限價/市價） |
| 委託價 | market 單顯示 i18n「市價」，否則 `fmtPrice` |
| 數量 | `fmtQty` |
| 成交進度 | 進度條（`filledQty/quantity`）+ 百分比；歷史 tab 也顯示 |
| 委託金額 | `price×quantity`（market 單以 `avgFillPrice` 或近似估，缺值顯示 `—`），`fmtTwd` 或 `fmtPrice` 視 quote |
| 狀態 | `BaseBadge` + 既有 `orderStatusVariant`；文案走 i18n（委託中/部分成交/已成交/已取消/已拒絕） |
| 操作 | 開倉/部分 → 「取消」；其餘 → 「明細」/`—` |

> 取消操作沿用 `useOrdersStore().cancel(id)` 與既有 toast 錯誤處理。「全部取消」對目前篩選結果中的 open/partial 逐筆呼叫 `cancel`，需有確認（使用既有 `useConfirm`）。

## 5. `BaseSparklineKpi.vue`（新增，`app/components/common/`）

純呈現元件，Base 前綴、可複用、無副作用。

```ts
interface Props {
  label: string
  value: string          // 已格式化字串（呼叫端負責 fmtTwd/fmtQty）
  series: number[]        // sparkline 資料點，≥2 點
  delta?: { dir: 'up' | 'down' | 'flat'; text: string }
  tone?: 'brand' | 'neutral'   // sparkline 線色：brand=primary、neutral=灰
}
```

- 以 inline SVG 畫折線 + 半透明面積；`preserveAspectRatio="none"` 隨容器寬度自適應。
- 顏色一律用 token（`var(--color-primary-400)` / `var(--color-text-muted)`），**禁 hex**。
- `delta` 漲跌僅為中性趨勢指示，**不套用市場紅綠**（避免與台灣盤面慣例語意混淆）：up=primary 強調、down/flat=muted。
- 高度固定、`series` 少於 2 點時隱藏圖只顯示數值。
- a11y：sparkline `aria-hidden`，數值與 label 為可讀文字。

## 6. `useOrderStats` composable（新增，`app/composables/`）

明確標註回傳型別（禁依賴 infer），回傳物件（非 reactive），純衍生、無生命週期副作用。

```ts
interface SparkSeries { value: number; series: number[]; delta: { dir: 'up'|'down'|'flat'; text: string } }
interface OrderStats {
  openCount: SparkSeries
  openNotional: SparkSeries
  filledToday: SparkSeries
  fee30d: SparkSeries
}
function useOrderStats(orders: Ref<Order[]>, trades: Ref<Trade[]>): ComputedRef<OrderStats>
```

> `SparkSeries.value` 為**原始 number**；頁面負責用 `fmtTwd`/`fmtQty` 等格式化成字串後，才傳給 `BaseSparklineKpi`（其 `value` prop 為已格式化 string）。職責分離：composable 算數字、頁面決定呈現格式。
>
> `delta` 推導：比較 `series` 最後一個 bucket 與前一個 bucket，較高=`up`、較低=`down`、相等或資料不足=`flat`；`text` 為差值或百分比的已格式化字串（合成序列亦同此規則，確保決定性）。

資料來源：

- **`filledToday` / `fee30d`**：從 `trades`（含 `timestamp` / `fee`）**真實計算**每日序列（近 7 日 / 近 30 日 bucket）。
- **`openCount` / `openNotional`**：目前僅有當下快照、無歷史 → 以專案既有 `createSeededRandom()` + `hashSeed()`（`app/utils/mock/seed.ts`）產**決定性合成序列**，種子由 `userId + 日期` 衍生，確保 SSR 與 CSR 一致（避免 hydration mismatch）。
- 純彙總邏輯抽到可測純函式（`app/utils/`，如 `order-stats.ts`），composable 只做 reactive 包裝。

> demo 文件需註明 openCount/openNotional 的 sparkline 為示範用合成資料。

## 7. `trades.vue` 重新設計

- 由舊 `<slot name="head">` 模式改為 **declarative `BaseTable`**（`columns` + `#cell-*` + `paginated` 內建分頁）。
- 頂部加彙總（可用 2–3 張 `BaseSparklineKpi` 或精簡 inline）：總成交筆數、總成交量、總手續費。
- 欄位：時間 / 幣對 / 方向（買綠賣紅）/ 價格 / 數量 / 手續費；保留既有「匯出 CSV」（`exportCsv` 邏輯不動）。
- `< md` 同樣以輕量卡片（可共用 `TraderOrderCard` 的精簡變體或獨立 `TraderTradeCard`）。
- 「← 回委託」改為與 orders 一致的第 3 tab 導覽脈絡。

## 8. RWD 策略

沿用專案既有 Tailwind 斷點（`sm` 640 / `md` 768 / `lg` 1024）：

| 區塊 | 手機 `<md` | 平板 `md` | 桌機 `lg+` |
|---|---|---|---|
| KPI grid | 2 欄 | 2 欄 | 4 欄 |
| Tab + 工具列 | tab 一列；幣對下拉全寬獨立一列；全部取消/刷新縮 icon（保留 `aria-label`） | 單列 | 單列 |
| 訂單資料 | `TraderOrderCard` 卡片清單（`block md:hidden`） | `BaseTable`（`hidden md:block`，次要欄位可隱） | `BaseTable` 全欄 |
| 明細 | `BaseModal` 近全寬（既有 `w-full px-4`） | `BaseModal` `width="md"` | `BaseModal` `width="md/lg"` 置中 |

`BaseSparklineKpi` 的 SVG 用 `preserveAspectRatio="none"` 隨寬度伸縮，不需斷點特例。

## 9. 篩選行為

- 狀態 tab（開倉中=`open|partial`；歷史=`filled|cancelled|rejected`）與幣對下拉**並存**。
- 幣對下拉選項：`全部幣對` + 由 `orders` 去重的 symbol（排序），label 含筆數（`BTC/TWD (3)`）。
- 切換 tab 時**保留**已選幣對；幣對選項以「全部訂單」為基底（切 tab 不會讓選項消失）。
- 全部以 `computed` 於前端對 store 資料過濾，無新 API。

## 10. 檔案盤點

**新增**
- `app/components/common/BaseSparklineKpi.vue`
- `app/components/trader/TraderOrderCard.vue`（手機卡片；trades 視需要加 `TraderTradeCard` 或共用變體）
- `app/composables/useOrderStats.ts`
- `app/utils/order-stats.ts`（純彙總函式 + 對應 Vitest）
- `tests/utils/order-stats.spec.ts`

**修改**
- `app/pages/trader/orders/index.vue`（重構版型、KPI、tab+工具列、表格/卡片、明細 modal）
- `app/pages/trader/orders/trades.vue`（declarative 表格 + 分頁 + 彙總）
- `i18n/locales/zh-TW.json`、`i18n/locales/en.json`（新增 key）

**不修改**：`BaseTable.vue`、`BaseModal.vue`、`BaseSelect.vue`、orders store、server API、其他 trader 頁。

## 11. i18n 新增 key（zh-TW / en 同步）

於 `trader.orders.*` / `trader.trades.*` 下新增（命名示意）：

- KPI：`kpi.openCount` / `kpi.openNotional` / `kpi.filledToday` / `kpi.fee30d` + 單位字
- Tab：`tab.history`（沿用既有 open/all 命名調整）、`tab.trades`
- 篩選：`filter.symbolLabel`、`filter.allSymbols`
- 狀態/類型：`status.open|partial|filled|cancelled|rejected`、`orderType.limit|market`、`price.market`
- 操作：`cancelAll`、`cancelAllConfirm`、`detail`、`refresh`（若 common 已有則沿用）
- 明細欄位：`detail.orderId|createdAt|updatedAt|avgFill|filled|remaining|fee|relatedTrades`
- 不寫死中文，全部走 key。

## 12. 測試策略

- `app/utils/order-stats.ts`：Vitest 單元測試 — 真實序列計算（給定 trades 算出 filledToday/fee30d）、合成序列**決定性**（相同 seed 相同輸出）、空資料邊界。
- 既有 `vitest + @vue/test-utils + happy-dom`；新增純函式 MUST 有測試（符合 utils 規範）。
- 元件層：`BaseSparklineKpi` 渲染 series → 產出 path 的 smoke test（選做，視 writing-plans 拆解）。

## 13. 約束與風險

- **Dev server bug**：專案路徑含空格/非 ASCII，`npm run dev` 首個 request 會 `IPC connection closed`。驗證一律用 `npm run build && npm run preview`，型別用 `npm run typecheck`。
- TypeScript strict、**禁 `any`**；型別 import 用 `import type`；composable 明確標註回傳型別。
- 色彩**僅用 token**（Tailwind utility / `var(--color-*)`），禁 hex；買綠賣紅為**正確性需求**不可弄反。
- 隨機性**必須**走 `createSeededRandom()` / `hashSeed()`，否則 SSR/CSR hydration mismatch。
- `console.log` 僅可包在 `if (import.meta.env.DEV)`。
- 每個 async（cancel/全部取消）需 try/catch + loading/error + toast。
- 不對共用元件動刀，降低跨頁回歸風險。

## 14. 完成定義（DoD）

- 桌機 / 平板 / 手機三斷點皆有良好體驗（KPI、tab+下拉、表格↔卡片、明細）。
- avgFillPrice / 成交進度 / 委託金額 / 訂單編號皆可見。
- 幣對下拉 + tab 篩選並存且正確；全部取消有確認與錯誤處理。
- trades 頁為 declarative 表格 + 分頁 + 彙總，CSV 匯出仍正常。
- 全字串走 i18n（zh-TW/en）；`npm run typecheck` 與 `npm test` 綠燈；`build && preview` 可正常瀏覽。
- 未動到非範圍檔案；docs 視需要補充（demo guide 註明合成 sparkline）。

## 15. 後續（範圍外，僅記錄）

- 將「KPI 區 + tab/工具列 + 表格↔卡片 + 明細 modal」pattern 推展到 wallet / markets / trade。
- 若未來多頁需要可展開列，再評估是否值得替 `BaseTable` 增加 expandable 能力。
