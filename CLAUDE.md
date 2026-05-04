# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定位

**Bank × VASP Demo** — 模擬**台灣 VASP（虛擬資產服務業者）× 合作銀行**合作模式的 Nuxt 4 參考實作，以 MAX × 東東商銀、BitoPro × 東東商銀、ACE × 凱基銀行為藍本，涵蓋 KYC、信託、撮合、風控、AML、CTR/SAR 報送的完整業務線。

**學習與溝通用的參考實作**，不是要上線的真實交易所 — 所有資料皆為 mock，沒有真正的撮合引擎、鏈上互動、銀行 API 串接。骨架（Day 1）→ 三端閉環 demo（Day 10）已完成，後續變動以 issue / PR 推進。

詳細業務與合規說明在 `docs/`（`00-overview.md` 是入口）。

## 技術棧

| 類別 | 選擇 | 備註 |
|------|------|------|
| Runtime | Node 22 LTS | `.nvmrc` 鎖定，`engines.node >=22` |
| Framework | Nuxt 4（`^4.4.2`） | SSR + 檔案式路由 + server routes 一站式 |
| Language | TypeScript strict（禁 `any`） | `nuxt.config.ts` 已開 `typescript.strict` |
| State | Pinia + `@pinia/nuxt` | 解構必用 `storeToRefs()` |
| Styling | Tailwind CSS（`@nuxtjs/tailwindcss`）+ `sass-embedded` | utility 取自 CSS 變數，禁 hex |
| Schema | Zod | runtime 驗證 + 型別同步推導 |
| Chart | `lightweight-charts` | 交易所 K 線輕量效能好 |
| Icons | `@nuxt/icon` | 全站 icon source |
| i18n | `@nuxtjs/i18n` | zh-TW（預設）/ en，no_prefix |
| Utils | `@vueuse/core` + `@vueuse/nuxt` | 通用 composable |
| Testing | `vitest` + `@vue/test-utils` + `happy-dom` | 設定在 `vitest.config.ts` |
| Type check | `vue-tsc` | `npm run typecheck` |

## 專案結構

```
bank-vasp-demo/
├── .nvmrc                       # 22
├── nuxt.config.ts               # modules / i18n / components 設定
├── tailwind.config.ts           # theme.colors → CSS 變數
├── vitest.config.ts             # happy-dom 環境
├── tsconfig.json
├── app/
│   ├── app.vue
│   ├── assets/scss/             # _tokens / _mixins / 三端主題 / _components
│   ├── layouts/                 # default / trader / admin / bank
│   ├── pages/                   # 三端路由（檔案式）
│   │   ├── index.vue            # 三端入口
│   │   ├── trader/              # 註冊 / KYC / 市場 / 交易 / 錢包 / 設定
│   │   ├── admin/               # KYC / 用戶 / 風控 / 撮合 / 稽核 / 報表
│   │   └── bank/                # 信託 / KYC 比對 / 對帳 / AML / CTR / SAR
│   ├── components/
│   │   ├── common/              # Base* 通用元件（pathPrefix: false）
│   │   └── trader/              # trader 專屬元件
│   ├── composables/             # useFavorites / usePagination / usePolling 等
│   ├── stores/                  # 9 個 Pinia store
│   ├── middleware/              # trader-auth / admin-auth（global）
│   └── utils/
│       ├── badge-variants.ts
│       ├── format.ts
│       └── mock/                # seed.ts + 各 entity mock 產生器
├── server/
│   ├── api/                     # trader / admin / bank / blacklist 共 80+ endpoint
│   └── utils/                   # matching / settlement / orderbook / regulator-export / *-store / require-*
├── shared/
│   ├── types/                   # index / admin / kyc-limits / symbol-slug / transfer-fees
│   └── utils/                   # blacklist
├── i18n/locales/                # zh-TW.json / en.json
├── tests/                       # vitest（shared / utils）
├── docs/                        # 業務 + 合規文件（00–11 + onboarding）
├── openspec/                    # OpenSpec 規格驅動工作流
└── public/
```

## 常用指令

```bash
nvm use                 # 鎖定 Node 22（必要）
npm install             # 會自動跑 `nuxt prepare`
npm run dev             # 開發 server — 注意下方警告
npm run build           # 產生 production build
npm run preview         # 跑 build 產物（dev 跑不起來時的 fallback）
npm run typecheck       # vue-tsc strict 型別檢查
npm test                # vitest run（單跑一次）
npm run test:watch      # vitest watch 模式
```

### ⚠️ Dev server 特殊狀況（與目前工作目錄有關）

本專案位於 `/Users/croxlink/Desktop/claude 測試/` 底下，路徑含**空格與非 ASCII 字元**。這會觸發 Nuxt 4 vite-node IPC bug，首次 request 就出現 `Error: IPC connection closed`（堆疊指向 `@nuxt/vite-builder/dist/vite-node.mjs`）。**Production build + preview 路徑不受影響**，在專案搬到純 ASCII 路徑（例如 `~/Projects/bank-vasp-demo/`）之前，請用 `npm run build && npm run preview` 做迭代。這是 Nuxt 已知限制，不是程式碼 bug。

## 架構

### 三端同一個 Nuxt app

整個合作關係被拆成同一個 Nuxt app 的**三個端**（trader / admin / bank），用 route prefix + `data-theme` 區分：

| Route prefix | Layout | `data-theme` | 角色 |
|---|---|---|---|
| `/trader/*` | `app/layouts/trader.vue` | `trader` | 交易所前台（End User）— 深色、活潑、交易員風格 |
| `/admin/*` | `app/layouts/admin.vue` | `admin` | 交易所後台（KYC/風控/稽核）— 中性專業 |
| `/bank/*` | `app/layouts/bank.vue` | `bank` | 合作銀行承辦端 — 信託、對帳、AML、CTR/SAR |
| `/` | `app/layouts/default.vue` | *(無)* | 三端入口切換 |

每個 layout 在根節點設 `<div data-theme="…">`，這個 attribute 是唯一的開關 — 它會重新綁定 `app/assets/scss/_tokens.scss` 定義的所有 `--color-*` CSS 變數。**Component 內禁止 hard-code 顏色**，一律用 Tailwind token（`bg-primary-500`、`text-text-muted`、`border-border`）或 SCSS 裡的 `var(--color-…)`。

### 色彩 token 流向

`_tokens.scss` 在 `:root` 定義 CSS 變數（light 預設），再用 `[data-theme='…']` 覆寫。`tailwind.config.ts` 的 `theme.colors` 不是硬編 hex，而是 reference 同一組 CSS 變數（`var(--color-primary-500)`），讓 Tailwind utility 與 SCSS 共用單一來源。**任何情況都不要複製 hex 值。**

**台灣盤面慣例**：`--color-market-up` 是**紅色** `#d93838`，`--color-market-down` 是**綠色** `#11866f`。價格漲跌請用 `.up` / `.down` utility class 或 `market-up` / `market-down` Tailwind 顏色 — **不要用 `success` / `danger`**（那兩個保留給系統狀態）。對台灣/華語圈使用者來說搞錯紅綠不是風格選擇，是**正確性 bug**。

切換西方配色（綠漲紅跌）可在 root 加 `[data-market-colors='western']` 覆寫。

### SCSS `@use` scope 陷阱

現代 Dart Sass 的 `@use` 是 per-file scope。如果一個 partial 要用 `_mixins.scss` 的 mixin，**那個 partial 自己**要 `@use 'mixins' as *;`，光在 `main.scss` import 不夠。參考 `_bank.scss` 的寫法。

### 資料層（mock-first）

- `shared/types/` 是 domain model 的唯一真相，按主題拆檔：`index.ts`（核心 entity）、`admin.ts`、`kyc-limits.ts`、`symbol-slug.ts`、`transfer-fees.ts`。每個 entity **同時提供 TypeScript type 與 Zod schema**，兩者必須同步。`shared/utils/` 放跨前後端的純函式（如 `blacklist.ts`）。
- `app/utils/mock/` 放 seed 資料與產生器。`seed.ts` 提供 `createSeededRandom()` + `hashSeed()` — **所有隨機性必須走這兩個 helper**，不然 SSR 與 CSR 產出的值不一致，會觸發 hydration mismatch。
- 行情：`mockMarkets`（USDT 幣對）+ `mockMarketsTwd`（**台幣幣對**，VASP × 銀行場景的核心）。K 線用 `generateKlines(symbol, count)`。

### Server API（mock backend）

`server/api/` 已實作三端 + 黑名單共 80+ 個 endpoint，分為：

- `server/api/trader/*` — 註冊、登入、KYC、市場、下單、成交、入出金、API key、設定
- `server/api/admin/*` — KYC 審核、用戶管理、風控告警、出入金覆核、撮合監控、稽核、CTR/SAR 報表
- `server/api/bank/*` — 信託專戶、KYC 比對、對帳、AML、CTR、SAR、監管報送
- `server/api/blacklist/*` — 跨端共用的黑名單查詢

**業務邏輯核心放在 `server/utils/`**，不是在 component 或 API handler 裡：

| 模組 | 用途 |
|---|---|
| `matching-engine.ts` | 訂單撮合 |
| `settlement-engine.ts` | 結算 |
| `orderbook-generator.ts` | 訂單簿 mock |
| `regulator-export.ts` | CTR/SAR 監管格式匯出 |
| `*-store.ts`（admin / aml / blacklist / report / trader） | 各端持久化 stub |
| `require-session.ts` / `require-admin.ts` | API 守衛 |

加新 endpoint 時請優先把業務邏輯放進 `server/utils/`，handler 只做參數驗證 + 呼叫。

### State / Routing / i18n

- **Pinia stores**（`app/stores/`）：`session`、`admin-session`、`kyc`、`markets`、`orders`、`wallet`、`settings`、`admin-reviews`、`notifications`。解構 state / getter 一律用 `storeToRefs()`。
- **路由守衛**：`app/middleware/{trader,admin}-auth.global.ts` 是 global middleware，會對對應 prefix 的路由做未登入導回。
- **i18n**：`@nuxtjs/i18n` + `i18n/locales/{zh-TW,en}.json`，`strategy: 'no_prefix'`、`defaultLocale: 'zh-TW'`、cookie key `i18n_locale`。**新增 UI 字串請走 i18n key，不要寫死中文**。

### 元件

- `app/components/common/` 全是 `Base*` 前綴的通用元件（Button、Input、Select、Checkbox、Textarea、Modal、Table、Pagination、Badge、Kpi、PageHeader、TabBar、SortHeader、DescriptionList、ToastHost、LangSwitch）。`nuxt.config.ts` 設 `pathPrefix: false`，template 直接寫 `<BaseButton>` 即可。
- `app/components/trader/` 放 trader 端專屬元件（OrderForm、OrderBook、KlineChart、HoldingsTable、FiatPanel、TierLimitsPanel、NotificationBell 等）。

### 測試

`vitest` + `@vue/test-utils` + `happy-dom`，設定在 `vitest.config.ts`。目前測試集中在 `tests/{shared,utils}/`。寫新的 utility 或 composable 請補對應測試。

### Path aliases

- `~` / `@` → `app/`
- `~~` / `@@` → 專案根目錄
- app 內取 domain type 一律用 `~~/shared/types`，不要在 `app/` 裡做 re-export。

## 文件（docs/）

`docs/` 是這個專案的**業務 + 合規**那一面，重要性不輸程式碼。**新增頁面或 entity 時記得同步更新對應文件 — docs 才是要拿給銀行 PM / 合規主管看的交付物。**

- `00-overview.md` — 入口，先讀這份
- `onboarding.md` — 沒接觸過區塊鏈 / 交易所業務的人先讀這份
- `01-regulation.md` — 洗防法、VASP 聲明登記、虛資法
- `02-business-flows.md` — 業務流程總覽
- `03-flows-money-movement.md` — 入金 / 出金 / 加密提領
- `04-flows-trading.md` — 市場列表與現貨交易
- `05-flows-personal-area.md` — 委託紀錄、設定、API keys
- `06-flows-admin-ops.md` — 後台 KYC、用戶管理
- `07-flows-admin-compliance.md` — 後台風控、出入金覆核、稽核、報表
- `08-flows-bank-trust.md` — 銀行端：信託、KYC 比對、對帳
- `09-flows-bank-compliance.md` — 銀行端：AML / CTR / SAR / 監管報送
- `10-demo-guide.md` — 完整 demo 腳本（15-20 分鐘 walkthrough）
- `11-security-checklist.md` — 金融業資安 checklist
