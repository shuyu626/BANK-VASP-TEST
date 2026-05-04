# 00 — 專案總覽

## 這個 demo 是什麼

一個模擬 **台灣 VASP（虛擬資產服務業者）× 合作銀行** 三端協作的練習專案。

目的是讓接案方（前端工程師）在真實案子進門前，
先對「銀行 × 交易所」這類業務的**全貌、流程、技術架構、資安合規重點**建立完整認知。

**本專案不是**：一個要上線的真實交易所。
**本專案是**：一個骨架 demo + 一整套業務/技術/資安文件，作為學習與溝通用的參考實作。

---

## 參考對標

| 交易所 (VASP) | 合作銀行 | 合作重點 |
|--------------|---------|---------|
| MAX          | 東東商銀 | 新台幣信託、KYC 比對 |
| BitoPro      | 東東商銀 | 新台幣信託、AML |
| ACE          | 凱基銀行 | 新台幣信託 |
| Rybit        | 凱基銀行 | 新台幣信託 |

本 demo 虛構「TaiEx × 東東商銀」的合作關係作為劇本。

---

## 法規依據

- 《洗錢防制法》
- 金管會 **VASP 聲明登記制度**（2024 起）
- 《虛擬資產服務法》（預計 2026 施行）
- 金管會 **《虛擬通貨平台及交易業務事業防制洗錢及打擊資恐辦法》**
- **虛擬通貨商業同業公會自律規範**

詳見 `01-regulation.md`。

---

## 三端系統

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Trader         │     │  Admin           │     │  Bank            │
│  使用者 End User │     │  交易所後台       │     │  銀行後台         │
│                 │     │                  │     │                  │
│ 註冊 · KYC       │────▶│ KYC 審核          │────▶│ 實名制比對        │
│ 入金 · 交易      │────▶│ 撮合 · 出入金      │◀───▶│ 信託 · 對帳 · AML │
│ 出金 · 提領      │────▶│ 風控 · 稽核       │────▶│ CTR · SAR · 報送 │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                 ▲
                                 │
                          ┌──────┴──────┐
                          │ 金管會/調查局 │
                          └─────────────┘
```

三端在本專案中都是**前端 web 介面**，資料由 Nuxt server routes 的 mock API 提供。

---

## 技術棧

| 類別 | 選擇 | 原因 |
|------|------|------|
| Node | 22 LTS | Nuxt 4 支援最佳、長期維護 |
| Framework | Nuxt 4（穩定版） | SSR + 檔案式路由 + server routes 一站式 |
| Language | TypeScript strict（禁 `any`） | 金融專案型別正確性要求高 |
| State | Pinia + `storeToRefs` | Nuxt 官方推薦，取代 Vuex |
| Styling | Tailwind CSS + SCSS/Sass | utility 快、SCSS 管 tokens & 主題變數 |
| Schema | Zod | runtime + 型別同時驗證 |
| Chart | lightweight-charts | 交易所 K 線輕量效能好 |
| Utils | `@vueuse/core` | 常用 composable |

---

## 色彩系統

核心品牌色：`#00403e`（primary-900，沉穩）+ `#00a19c`（primary-500，活力）。

三端切換靠 `<div data-theme="trader|admin|bank">` 屬性，
SCSS 在 `app/assets/scss/_tokens.scss` 用 CSS 變數覆寫。

盤面採 **台灣慣例：紅漲綠跌**（跟系統 `success`/`danger` 語義色刻意區隔）。

詳見 `app/assets/scss/_tokens.scss`。

---

## 專案結構

```
bank-vasp-demo/
├── .nvmrc                   # 22
├── app/
│   ├── app.vue
│   ├── assets/scss/         # 設計系統（tokens + 三端主題）
│   ├── layouts/             # trader / admin / bank / default
│   ├── pages/               # 三端路由
│   ├── components/          # 共用 + 三端各自
│   ├── composables/
│   ├── stores/              # Pinia
│   └── utils/mock/          # mock 資料 + seeded random
├── server/api/              # Nuxt 4 server routes（mock backend）
├── shared/types/            # 前後端共用 domain model + Zod
├── docs/                    # 業務/技術/資安文件（你正在讀這份）
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 如何跑起來

```bash
# 確認 Node 22
nvm use

# 安裝（首次）
npm install

# 開發 server
npm run dev
# → http://localhost:3000
```

然後在瀏覽器打開 `http://localhost:3000`，你會看到三端入口卡片，
點進去就能切到對應的 trader / admin / bank 介面。

---

## 閱讀順序建議

> **沒接觸過區塊鏈/交易所業務？先讀 [`onboarding.md`](./onboarding.md)** —— 一份 30 分鐘的入門文件，建立心智模型後再看下面的細節文件會輕鬆很多。

1. **`00-overview.md`** — 你現在在這裡
2. `01-regulation.md` — 法規背景（洗防法、VASP、虛資法）
3. `02-business-flows.md` — 業務流程總覽（開戶到稽核）
4. `03-flows-money-movement.md` — 入金 / 出金 / 加密提領
5. `04-flows-trading.md` — 市場列表與現貨交易
6. `05-flows-personal-area.md` — 委託紀錄、設定、API keys
7. `06-flows-admin-ops.md` — 後台 KYC 審核、用戶管理
8. `07-flows-admin-compliance.md` — 後台風控、出入金覆核、稽核、報表
9. `08-flows-bank-trust.md` — 銀行端：信託、KYC 比對、對帳
10. `09-flows-bank-compliance.md` — 銀行端：AML / CTR / SAR / 監管報送
11. `10-demo-guide.md` — 完整 demo 腳本（15-20 分鐘 walkthrough）
12. `11-security-checklist.md` — 金融業資安 checklist

---

## Roadmap（規劃中）

| 階段 | 內容 | 狀態 |
|------|------|------|
| Day 1 | 專案骨架、設計 tokens、三端 layout、mock 資料 | ✅ |
| Day 2 | Trader：註冊/登入/KYC/資產頁面 + docs 01/02 | ✅ |
| Day 3 | Trader：入金/出金/加密提領 + docs 03 + 大額 AML 觸發 | ✅ |
| Day 4 | Trader：市場列表 + 現貨交易頁（K 線 + 訂單簿 + 下單）+ docs 04 | ✅ |
| Day 5 | Trader：委託/成交紀錄、設定（密碼/2FA/API keys/偏好）+ docs 05 | ✅ |
| Day 6 | Admin：登入 + Dashboard + KYC 審核 + 用戶管理（凍結/風險調整）+ docs 06 | ✅ |
| Day 7 | Admin：風控告警 + 撮合監控 + 出入金覆核 + 稽核日誌 + 監管報表 + CTR 自動生成 + docs 07 | ✅ |
| Day 8 | Bank：信託專戶、KYC 比對、對帳 + docs 08 | ✅ |
| Day 9 | Bank：AML、CTR、SAR、監管報送 + docs 09 | ✅ |
| Day 10 | 整合閉環 demo guide + 資安 checklist（docs 10、11） | ✅ |
