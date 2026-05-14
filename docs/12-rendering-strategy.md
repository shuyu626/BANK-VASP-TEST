# 12 — 前端渲染策略（SSR / CSR / SSG Hybrid）

本文件記錄 Bank × VASP Demo 的**渲染模式分配方案**，以及背後的推理依據。
目的：在「銀行交易所 demo」這個情境下，為三端（trader / admin / bank）的每條路由
明確指定 SSR / CSR / SSG，作為 `nuxt.config.ts` 的 `routeRules` 設定依據。

> 本文件對應未實作的設定變更 — 實作前請先審閱「七、待實作的 `routeRules` 設定」一節。

---

## 一、為什麼是 Hybrid 而不是「全 SSR」或「全 SPA」

| 選項 | 評估 | 結論 |
|---|---|---|
| 全站 SSR（目前預設） | 三端絕大多數頁面是登入後的互動式儀表板，SSR 沒帶來 SEO 或首屏價值，反而把每次 request 都打到 Node server | ✗ 過度浪費 |
| 全站 SPA（`ssr: false`） | 失去 `/` 與 `/trader` 公開 landing 的 SEO；未來示範 CSP nonce 時沒有 SSR 注入點；middleware 行為要重新驗證 | ✗ 可惜 |
| **Hybrid（routeRules 分配）** | 公開頁 SSG、登入入口 SSR（保留 nonce 注入點）、登入後互動頁 CSR — 與真實 VASP 上線版的策略一致 | ✓ 採用 |

對應「真實上線版」的策略請見 `docs/11-security-checklist.md` 與後續的 CSP 文件。
這份 demo 不打算示範 server 端 nonce 注入完整流程，但**架構要為未來預留接口**。

---

## 二、目前專案實況盤點

### 2.1 路由現況

**三端入口**
- `/` — 三端切換頁（純靜態 marketing 內容）

**Trader 端**（`app/middleware/trader-auth.global.ts` 守衛）
- 公開：`/trader`、`/trader/login`、`/trader/register`
- KYC 流程：`/trader/kyc`、`/trader/wallet`（KYC 未過時允許）
- 登入後：`/trader/markets`、`/trader/trade/[symbol]`、`/trader/orders/*`、
  `/trader/wallet/*`、`/trader/settings/*`

**Admin 端**（`app/middleware/admin-auth.global.ts` 守衛）
- 公開：`/admin/login`
- 登入後：`/admin`、`/admin/audit`、`/admin/blacklist`、`/admin/fiat`、`/admin/kyc/*`、
  `/admin/orderbook`、`/admin/reports`、`/admin/risk/*`、`/admin/users/*`

**Bank 端**（目前無 middleware 守衛，demo 直接可訪）
- `/bank`、`/bank/aml/*`、`/bank/blacklist/*`、`/bank/ctr/*`、`/bank/kyc-match/*`、
  `/bank/reconciliation/*`、`/bank/regulator-reports/*`、`/bank/sar/*`、`/bank/trust-accounts/*`

### 2.2 中介層行為的關鍵點

兩個 global middleware 都會呼叫 `await session.init()`。session store 透過 `$fetch`
讀取 cookie / mock session — 這個動作在 SSR 與 CSR 模式下的行為差異需要清楚掌握：

- **SSR 路由**：middleware 會先在 server 跑一次，再在 client hydrate 後再跑一次。
  server 端因為沒有 browser cookie context（除非走 SSR cookie forwarding），通常會
  判定為「未登入」。對 login 頁這沒問題（停在 login 是正確結果），但對「登入後」
  的頁面會多一次無用 redirect，造成 SSR 失去意義。
- **CSR 路由（`ssr: false`）**：middleware 只在 client 跑，session 從 cookie 正常 init，
  行為單純且符合預期。

**這是把登入後頁面設為 CSR 的關鍵原因 — 不只是效能，是行為正確性。**

---

## 三、渲染模式分配總表

| 路由 | 模式 | 設定 | 理由 |
|---|---|---|---|
| `/` | SSG | `prerender: true` | 純 marketing 卡片，無動態資料，SEO + 首屏雙贏 |
| `/trader` | SSG | `prerender: true` | 公開 landing；middleware 對 `/trader` 視為 public，prerender 後 client 端 hydrate 時 middleware 仍會跑 |
| `/trader/login` | SSR | `ssr: true` + `Cache-Control: no-store` | 公開頁；per-request CSP nonce 注入點；nonce 不可被快取共用 |
| `/trader/register` | SSR | `ssr: true` + `Cache-Control: no-store` | 同上 |
| `/trader/kyc` | **SSR** | `ssr: true` + `Cache-Control: no-store` + KYC SDK CSP override | **第三方 KYC SDK（Sumsub/Onfido/Jumio）必須在嚴格 CSP 下載入，需要 per-request nonce + 該 SDK 的 frame-src / connect-src 白名單** |
| `/trader/markets` | CSR | `ssr: false` | 即時行情、polling、本地排序 — 不適合 SWR（會把過期價快取給其他使用者） |
| `/trader/trade/[symbol]` | CSR | `ssr: false` | K 線、order book、下單 — 純互動 |
| `/trader/wallet/**` | CSR | `ssr: false` | 餘額、入出金、銀行帳號 — 登入後狀態，目前 demo 無第三方金流 SDK，未來若整合需個別升級為 SSR |
| `/trader/orders/**` | CSR | `ssr: false` | 委託、成交紀錄 |
| `/trader/settings/**` | CSR | `ssr: false` | 個資、安全、API keys |
| `/admin/login` | SSR | `ssr: true` + `Cache-Control: no-store` | 同 trader login，per-request nonce |
| `/admin/**` | CSR | `ssr: false` | 後台所有功能頁皆為登入後互動 |
| `/bank/**` | CSR | `ssr: false` | 銀行端 dashboard、表格、虛擬化 stream |
| `/api/**` | — | （不適用 routeRules.ssr） | Nitro server route，獨立執行 |

---

## 四、Edge Cases 與行為驗證清單

| 情境 | 預期行為 | 驗證方式 |
|---|---|---|
| 未登入訪問 `/trader/wallet`（CSR） | client middleware 跑 → navigateTo('/trader/login?redirect=...') | `npm run preview` 後手動測試 |
| 已登入但未過 KYC 訪問 `/trader/markets`（CSR） | middleware 將其導向 `/trader/kyc` | 同上 |
| 已登入訪問 `/trader/login`（SSR） | server 端 session 判定為未登入 → 停在 login；client hydrate 後若已登入則 redirect 到 `/trader/wallet` | 觀察 hydration 後是否短暫閃 login 頁 |
| 訪問 `/`（SSG） | 直接拿到靜態 HTML，無 server 呼叫 | `curl` 看 response 是否含完整 markup |
| 訪問 `/trader`（SSG） | 同上；client 端 middleware 判斷 public → 不動 | hydration 後檢查無 redirect |
| Pinia store 在 SSR 路由的初始化 | SSR 路由不應依賴 client-only state；login/register 頁本來就無需 store 預載 | 檢視 login 頁 setup 是否誤用 client-only API |
| `useHead` / `<Title>` 行為 | SSG 路由 build 時寫入；CSR 路由由 client 寫入 | 開發者工具看 `<head>` 是否正確 |
| i18n cookie（`i18n_locale`） | `detectBrowserLanguage` 仍正常運作；SSG 頁面以 `defaultLocale` 預生，client 端 detect 後切換 | 切換語系後 SSG 頁仍可正常顯示 |

---

## 五、Dev / Build 注意事項

1. **Dev server 已知問題**：本專案路徑含非 ASCII 字元觸發 Nuxt 4 vite-node IPC bug，
   `npm run dev` 不可用 — `routeRules` 設定後請以 `npm run build && npm run preview`
   驗證。詳見 `CLAUDE.md`「Dev server 特殊狀況」段落。
2. **`prerender` 路由必須能在 build 時取得內容** — `/` 與 `/trader` 都是純靜態內容，
   沒有呼叫 server API，沒問題。
3. **Pinia / VueUse 在 SSG 頁面**：兩個 SSG 路由（`/`、`/trader`）目前都沒呼叫 store，
   也沒用到 client-only API。若未來新增使用 `useSessionStore` 等動作，要改為 CSR 或
   用 `<ClientOnly>` 包裹。
4. **`/admin/login` 與 `/trader/login` 設為 SSR 後**，要確認 layout（`default.vue` 或
   各自 layout）內沒有 client-only 副作用。
5. **`@nuxtjs/i18n` 的 `strategy: 'no_prefix'` 與 SSG**：`/` 與 `/trader` 會以
   `defaultLocale: 'zh-TW'` 預生，cookie-based 切換在 client hydrate 後生效。

---

## 六、CSP + Nonce 實作方案

本 demo **這次會實作 CSP**，藉由 `nuxt-security` 模組統一處理。
路徑分配與 CSP 對齊邏輯如下：

### 6.1 為什麼用 `nuxt-security`

- 由 Nuxt 官方 community 維護，與 Nitro middleware 整合最深
- 內建 nonce 自動注入（per-request 動態 nonce）+ 多組安全 headers
- 設定集中在 `nuxt.config.ts`，不需要自行寫 H3 middleware
- 可與 `routeRules` 共存，**逐路由覆蓋**安全策略

### 6.2 三類路由的 CSP 模式對齊

| 路由類型 | 範例 | nonce | CSP 處理方式 |
|---|---|---|---|
| SSG（prerender） | `/`、`/trader` | ✗ 不可用（HTML 在 build time 固定） | `'self'` + `'strict-dynamic'` + 預先計算的 inline script hash |
| SSR | `/trader/login`、`/admin/login`、`/trader/register` | ✓ 每個 request 動態生成 | `'self'` + `'nonce-{N}'` + `'strict-dynamic'` |
| CSR(`ssr: false`) | 其他全部 | ✓ Nitro 渲染 SPA shell 時仍可注入 | 同 SSR，nonce-based |

> **關鍵點**：`ssr: false` 不等於「沒有 server」。Nitro 仍然會在 request 時送出
> HTML shell，這個過程允許 nuxt-security 注入 nonce。**只有 `prerender: true`
> 的路由完全沒有 request-time 機會。**

### 6.3 CSP Policy 內容（demo 預設）

| Directive | 值 | 理由 |
|---|---|---|
| `default-src` | `'self'` | 預設只允許同源 |
| `script-src` | `'self' 'nonce-{N}' 'strict-dynamic'` | 配 nonce + strict-dynamic（讓動態載入的子 script 繼承信任） |
| `style-src` | `'self' 'nonce-{N}' https://fonts.googleapis.com` | Google Fonts CSS 走 nonce 例外 |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Google Fonts 字檔 + base64 內嵌 |
| `img-src` | `'self' data: https:` | demo 用到的 icon、QR code、外部圖示 |
| `connect-src` | `'self'` | mock API 走同源 `/api/*` |
| `frame-ancestors` | `'none'` | 防 clickjacking(VASP 必備) |
| `base-uri` | `'self'` | 防 base tag injection |
| `form-action` | `'self'` | 表單只能送回自家 |
| `object-src` | `'none'` | 禁用 `<object>` / `<embed>` |
| `upgrade-insecure-requests` | (啟用) | 強制 https(部署有 TLS 後生效) |

### 6.4 上線流程（Report-Only → Enforce）

1. **第一階段**：以 `Content-Security-Policy-Report-Only` header 上線，**不阻擋**違規
2. 蒐集瀏覽器回報的 violation（暫時印到 server log，未來可接 Sentry）
3. 修正所有 violation，連續 24~48 小時沒新事件
4. **第二階段**：切換為 `Content-Security-Policy`，正式 enforce

本 demo 預設直接 enforce(因為內容是控制範圍內的 mock)，但保留切換 flag。

### 6.5 其他安全 headers

`nuxt-security` 同時會送出以下 headers，與 CSP 共同構成完整防護：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`(與 `frame-ancestors: 'none'` 雙保險)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security`(HSTS，僅在 https 部署時有意義)

---

## 七、待實作的設定(`nuxt.config.ts`)

以下是最終要加到 `nuxt.config.ts` 的內容。**等待使用者確認後再實作**：

### 7.1 安裝套件

```bash
npm install --save-dev nuxt-security
```

> 套件會被 `pre-install.js` hook 先做 OSV 漏洞 + license 評估，通過才會實際安裝。

### 7.2 `nuxt.config.ts` 變更（production 版）

```ts
export default defineNuxtConfig({
  // ... 既有設定不動

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/icon',
    'nuxt-security'
  ],

  // === 渲染策略 ===
  routeRules: {
    '/':                       { prerender: true },
    '/trader':                 { prerender: true },

    // SSR + nonce：HTML 含 per-request nonce，禁快取（不可被共用）
    '/trader/login':           { ssr: true, headers: { 'Cache-Control': 'no-store' } },
    '/trader/register':        { ssr: true, headers: { 'Cache-Control': 'no-store' } },
    '/admin/login':            { ssr: true, headers: { 'Cache-Control': 'no-store' } },

    // KYC：SSR + nonce + 第三方 SDK 白名單（Sumsub 為實作藍本）
    // strict-dynamic 已涵蓋 script-src/style-src，只補 SDK 需要的 frame/connect/img/media
    '/trader/kyc':             {
      ssr: true,
      headers: { 'Cache-Control': 'no-store' },
      security: {
        headers: {
          contentSecurityPolicy: {
            'connect-src': ["'self'", 'https://api.sumsub.com', 'wss://api.sumsub.com'],
            'frame-src': ['https://*.sumsub.com'],
            'img-src': ["'self'", 'data:', 'blob:', 'https://*.sumsub.com'],
            'media-src': ["'self'", 'blob:']
          }
        }
      }
    },

    '/trader/markets':         { ssr: false },
    '/trader/trade/**':        { ssr: false },
    '/trader/wallet/**':       { ssr: false },
    '/trader/orders/**':       { ssr: false },
    '/trader/settings/**':     { ssr: false },

    '/admin':                  { ssr: false },
    '/admin/**':               { ssr: false },

    '/bank':                   { ssr: false },
    '/bank/**':                { ssr: false }
  },

  // === Security / CSP 設定 ===
  security: {
    nonce: true,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'nonce-{{nonce}}'",
          "'strict-dynamic'"
        ],
        'style-src': [
          "'self'",
          "'nonce-{{nonce}}'",
          'https://fonts.googleapis.com'
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': true
      },
      crossOriginEmbedderPolicy: 'unsafe-none', // 避免阻擋 Google Fonts
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: []
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true
      }
    }
  }
})
```

> **Glob 順序**：Nuxt routeRules 越具體的規則優先級越高，`/admin/login` 的 SSR 設定
> **不會**被 `/admin/**` 的 CSR 覆寫。已驗證可安全並存。

### 7.3 SSG 路由的 CSP 例外處理

`/` 與 `/trader` 是 prerender，HTML 中無法插入 per-request nonce。
`nuxt-security` 會在 build time 自動：
- 計算 inline `<script>`、`<style>` 的 SHA-256 hash
- 將 hash 加進 SSG 路由專屬的 meta `<meta http-equiv="Content-Security-Policy">`
- 配合 `'strict-dynamic'`，動態載入的子資源仍受信任

實務上**不需要手動處理**，但若 build 出現 CSP 違規警告，要把對應 hash 加到 `script-src`。

---

## 八、驗證 checklist(實作完成後)

### 8.1 渲染模式
- [ ] `npm run build` 通過，無 prerender 錯誤
- [ ] `npm run preview` 啟動成功
- [ ] `curl http://localhost:3000/` 拿到完整 HTML(含 `<h1>`、卡片 markup)
- [ ] `curl http://localhost:3000/trader/markets` 拿到 SPA shell(空 `<div id="__nuxt">`)
- [ ] 瀏覽器訪問 `/trader/login` 看 view source 含完整表單(SSR 驗證)
- [ ] 未登入直接訪問 `/trader/wallet` 會被 client middleware 導到 login
- [ ] 已登入訪問 `/trader/markets` 不會出現 server-side redirect 閃爍
- [ ] `npm run typecheck` 通過
- [ ] 三端 demo 腳本(`docs/10-demo-guide.md`)全程順暢

### 8.2 CSP / Security headers
- [ ] `curl -I http://localhost:3000/` 含 `Content-Security-Policy` header
- [ ] `curl -I http://localhost:3000/trader/login` CSP 中含 `nonce-XXXX`(每次請求 nonce 不同)
- [ ] `curl -I http://localhost:3000/trader/markets` CSP 也含 nonce
- [ ] 瀏覽器 DevTools Console 無 CSP violation 警告
- [ ] `curl -I` 同時送出 `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`
- [ ] securityheaders.com 評等 **A** 以上(部署到 https 後再測)

---

## 九、Docker + Nginx 部署架構

### 9.1 為什麼用兩個 container（架構 B：Nginx 分流）

```
┌──────────┐      ┌───────────────────────────┐      ┌──────────────────┐
│ Browser  │ ───► │ Nginx :80 (8080)          │      │ Nuxt/Nitro :3000 │
└──────────┘      │                           │      │  built app       │
                  │  /_nuxt/* → 直接吐靜態檔  │      │  + nuxt-security │
                  │  /trader/login,kyc,...    │ ───► │                  │
                  │      reverse proxy (SSR)  │      └──────────────────┘
                  │  / (SSG fallback) → nitro │
                  │  + 共用安全 headers       │
                  └───────────────────────────┘
```

| Container | 角色 | 內容物 |
|---|---|---|
| `nuxt` | Nitro Node server，運行 `node .output/server/index.mjs` | 處理 SSR 路由（login/register/kyc + admin/login）、CSR shell、`/api/*` |
| `nginx` | Reverse proxy + 共用 security header + 靜態檔加速 | 烤了 `.output/public/`，`/_nuxt/*` 與預渲染 HTML 直接吐，SSR 路由反代到 nuxt container |

**架構 B 的關鍵分工**：CSP **由 nuxt-security 從 Nitro 端注入**（含 per-request nonce），Nginx **NEVER** 重設 `Content-Security-Policy` header，否則會覆蓋掉 nonce。共用的非 CSP header（X-Frame-Options、Referrer-Policy 等）由 Nginx 統一補。

### 9.1.1 架構 A vs 架構 B 比較

| 面向 | 架構 A：全部過 Nitro | 架構 B：Nginx 分流（目前採用） |
|---|---|---|
| Nginx 角色 | 純反向代理，所有 request 轉發到 Nitro | 同時當靜態檔伺服器 + 反向代理 |
| 靜態檔（`/_nuxt/*.js`、預渲染 HTML） | 也走 Nitro，吃一點 Node CPU | Nginx 直接吐，極低延遲 + 1 年強快取 |
| 部署複雜度 | 低（Nginx config ~20 行） | 中（要分 location 規則，但已寫好） |
| OP 學習曲線 | 與一般 Node 應用反代相同 | 要懂哪些路徑屬於 SSR、哪些屬於 SSG |
| Nitro CPU 負荷 | 高（連 CSS / JS chunk 都過 Node） | 低（只處理 SSR + API） |
| 流量擴展性 | 中（瓶頸在 Nitro 單進程） | 高（Nginx 多 worker，可水平擴 nuxt 多實例） |
| 適用情境 | 流量小、OP 資源緊、求最快上線 | **production VASP**：流量會成長、要極致效能 |

### 9.1.2 「分流」具體是分什麼？

```
請求進來 → Nginx 判斷路徑
   ├─ /_nuxt/abc123.js                       → 讀本地檔，回 200 + 1 年 cache header
   ├─ /                                       → 讀本地 /var/www/nuxt/index.html，直接回
   ├─ /trader                                 → 讀本地 /var/www/nuxt/trader/index.html，直接回
   ├─ /trader/login | register | kyc          → 反代到 nuxt:3000（SSR + nonce CSP）
   ├─ /admin/login                            → 反代到 nuxt:3000（SSR + nonce CSP）
   ├─ /api/*                                  → 反代到 nuxt:3000（Nitro server route）
   └─ /admin, /bank, /trader/markets 等其他   → 反代到 nuxt:3000（CSR shell，仍由 Nitro 注 nonce）
```

對比「全部過 Nitro」：上面**每一條**都直接 `proxy_pass http://nuxt:3000`，靜態檔也經 Node 處理。功能正確但效能與擴展性都吃虧。

### 9.2 為什麼選 8080 對外

- macOS 上 port 80 可能被其他服務或系統保留；8080 避免衝突
- 上線版要對外 80/443 時改 `docker-compose.yml` ports 一行即可

### 9.3 路徑非 ASCII 的好處

Container 內路徑是 `/app`，**完全避開 Nuxt 4 vite-node IPC bug**。
這代表 Docker 部署的 build 流程比本地 `npm run dev` 更穩定。

### 9.4 待新增的檔案

| 檔案 | 用途 |
|---|---|
| `Dockerfile` | Multi-stage build：node:22-alpine → 安裝 → 建置 → 精簡 runtime |
| `.dockerignore` | 排除 `node_modules`、`.nuxt`、`.output`、`docs`、`tests` 等不需進 image 的目錄 |
| `docker/nginx.conf` | Nginx reverse proxy 設定(含補強 headers) |
| `docker-compose.yml` | 拼起 nuxt + nginx 兩個 service |

### 9.5 `Dockerfile` 內容（多 stage + nginx target）

```dockerfile
# syntax=docker/dockerfile:1.6

# ===== Stage 1: build =====
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== Stage 2: nitro runtime =====
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

# ===== Stage 3: nginx edge =====
# 把預渲染 HTML 與 _nuxt 靜態 chunk 烤進 nginx image，
# 由 nginx 直接吐靜態檔；SSR / CSR shell 才反向代理到 nitro container。
FROM nginx:1.27-alpine AS nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public /var/www/nuxt
EXPOSE 80
```

docker-compose 透過 `target: runner` 與 `target: nginx` 分別 build 兩個 image，共用 builder stage 的 BuildKit 快取，重 build 不會跑兩次 `npm ci`。

### 9.6 `.dockerignore` 內容

```
node_modules
.nuxt
.output
.git
.gitignore
.idea
.vscode
.DS_Store
docs
openspec
tests
*.log
README.md
```

### 9.7 `docker/nginx.conf` 內容（架構 B：分流）

實際內容見 `docker/nginx.conf`。重點分四段：

1. **共用 security headers（server 區塊）** — `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`、`COOP`。**CSP 不在 Nginx 設定**，避免覆蓋 nuxt-security 注入的 nonce。
2. **`location /_nuxt/`** — Nginx 直接吐靜態 chunk，`expires 1y` + `Cache-Control: public, immutable`，access log 關掉。
3. **`location /api/`** 與 **SSR 路由 location**（`~ ^/(trader/(login|register|kyc)|admin/login)`）— 反向代理到 `nuxt_upstream`，**明確 `proxy_no_cache 1; proxy_cache_bypass 1;`** 確保 nonce HTML 永遠不被 Nginx 快取。
4. **`location /` + `@nitro` fallback** — `try_files` 先試本地 SSG 靜態檔，找不到就丟給 Nitro 處理 CSR shell。

### 9.7.1 為何 SSR location 必須 `proxy_no_cache 1`

nuxt-security 對 SSR 路由每次 request 都生成新 nonce 並嵌進 HTML。若 Nginx（或 CDN）把 A 使用者收到的 HTML 快取下來餵給 B，B 拿到的是 A 的 nonce：
- B 的 inline script 沒帶 A 的 nonce → 被 CSP 擋掉 → 整頁壞掉
- 更糟的情境：攻擊者拿到「曾被快取的 nonce」用 XSS payload 在快取期間內 bypass CSP

這是 strict CSP 最常被踩雷的點，所以 SSR location **嚴禁** 任何形式的 proxy_cache / fastcgi_cache。

### 9.8 `docker-compose.yml` 內容

```yaml
services:
  nuxt:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: bank-vasp-nuxt
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3000
    restart: unless-stopped
    expose:
      - "3000"
    networks:
      - bank-vasp-net

  nginx:
    build:
      context: .
      dockerfile: Dockerfile
      target: nginx
    container_name: bank-vasp-nginx
    depends_on:
      - nuxt
    ports:
      - "8080:80"
    restart: unless-stopped
    networks:
      - bank-vasp-net

networks:
  bank-vasp-net:
    driver: bridge
```

> 與架構 A 的差異：
> - nginx service 從 `image: nginx:1.27-alpine` + `volumes: ./docker/nginx.conf` mount，改為 `build: target: nginx` — 因為要把 `.output/public/` 烤進 image
> - 改設定後必須 `docker compose up -d --build` 重 build nginx image，不能光重啟

---

## 十、部署手把手步驟(實作完成後一起操作)

> 這節是給「第一次部署」的逐步指引。實作完上述設定後，我們一起按這個順序跑。

### 10.1 先決條件確認

1. **Docker Desktop 必須在執行中**
   - macOS 上：選單列看到鯨魚 icon，且狀態是綠色「Docker Desktop is running」
   - 終端機驗證：`docker info` 不會報錯
2. 終端機切到專案根目錄
   ```bash
   cd /Users/croxlink/Desktop/claude測試/bank-vasp-demo
   ```

### 10.2 第一次建置 image

```bash
docker compose build
```

- 第一次跑：5–10 分鐘(要下載 `node:22-alpine`、`nginx:1.27-alpine`、跑 `npm ci` + `npm run build`)
- 看到 `=> => exporting layers` 與 `naming to docker.io/library/bank-vasp-demo-nuxt` 就是成功
- 若卡在 `npm ci`：通常是網路問題，重跑即可

### 10.3 啟動 containers

```bash
docker compose up -d
```

- `-d` = detach(背景跑)
- 預期輸出：
  ```
  ✔ Container bank-vasp-nuxt   Started
  ✔ Container bank-vasp-nginx  Started
  ```

### 10.4 確認狀態

```bash
docker compose ps
```

兩個 container 都應該是 `Up`(不是 `Exited`、不是 `Restarting`)。
若 `nuxt` 狀態異常：

```bash
docker compose logs nuxt
```

### 10.5 在瀏覽器驗證

打開 http://localhost:8080

依序測試：
- 首頁 `/`(SSG)— 應該秒開
- `/trader`(SSG)
- `/trader/login`(SSR)— View Source 應該看得到完整表單 HTML
- `/trader/markets`(CSR)— View Source 應該幾乎沒內容，全靠 JS 渲染
- `/admin`、`/bank` 巡一下

### 10.6 驗證 CSP headers

```bash
# 看首頁的 headers
curl -sI http://localhost:8080/ | grep -iE 'csp|content-security|x-frame|permissions|referrer'

# 看 SSR 頁的 nonce(每次 curl 結果不同)
curl -sI http://localhost:8080/trader/login | grep -i 'content-security'
curl -sI http://localhost:8080/trader/login | grep -i 'content-security'
```

每次跑第二次 / 第三次，CSP 裡的 `nonce-XXXX` 應該不一樣 — 這證明 nuxt-security 正確生成 per-request nonce。

### 10.7 線上工具評等(可選)

部署到公開網域 + https 後，可以用：
- https://securityheaders.com/ — 應達 A 級
- https://csp-evaluator.withgoogle.com/ — 評 CSP policy 強度

本機 http://localhost 無法被這些工具測，僅作為上線後的最終驗證。

### 10.8 停止 / 清理

```bash
docker compose down              # 停 + 清掉 container 與 network(保留 image)
docker compose down --rmi all    # 連 image 一起刪(要重新 build 才能再跑)
docker compose logs -f nginx     # 即時看 nginx access log(按 Ctrl+C 結束)
docker compose restart nuxt      # 改完設定後重啟單一 container
```

### 10.9 改設定後重新部署

修改 `nuxt.config.ts` 或元件 → 要重新 build image：

```bash
docker compose up -d --build
```

只改 `docker/nginx.conf` → 只要重啟 nginx：

```bash
docker compose restart nginx
```

### 10.10 常見錯誤對照

| 症狀 | 可能原因 | 解法 |
|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop 沒開 | 開啟 Docker Desktop 等出現綠燈 |
| `port is already allocated` | 8080 被其他服務佔用 | `lsof -i :8080` 找凶手，或改 compose 的 port 為 8081 |
| Nginx 502 Bad Gateway | nuxt container 還沒起來 / build 失敗 | `docker compose logs nuxt` 看錯誤 |
| CSP 違規導致頁面壞掉 | policy 太嚴格、有外部資源沒列入白名單 | 開 DevTools Console 找出被 block 的 URL，加進對應 directive |
| Image build 時 `npm ci` 失敗 | lockfile 與 package.json 不一致 | 先在本機跑 `npm install` 同步 lockfile 再 build |
