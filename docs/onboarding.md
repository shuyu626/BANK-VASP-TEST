# 新人入門：交易所 × 區塊鏈快速上手

> 給沒接觸過區塊鏈或加密貨幣交易所業務的工程師。
> 目的是建立心智模型，看完這份再去看其他 `docs/*` 細節文件會輕鬆很多。
> 預計閱讀時間：30 分鐘。

---

## 一、這個專案是什麼

一個模擬「**台灣加密貨幣交易所 × 合作銀行**」的 demo 網站，**所有資料都是假的**，重啟就歸零。

它把三個介面（trader / admin / bank）放在同一個 Nuxt app：

| 端 | 像誰 | 對應現實 |
|---|------|--------|
| **Trader** | 用戶（散戶） | 你打開幣安、MAX 看到的介面 |
| **Admin** | 交易所員工 | 內部後台（合規 / 風控 / 客服） |
| **Bank** | 合作銀行行員 | 銀行內部系統，做信託保管與合規通報 |

劇本是「TaiEx 交易所 × 東東商銀」，藍本是現實的 MAX × 遠東商銀、BitoPro × 遠東商銀、ACE × 凱基銀行。

**不是**真實交易所，**是**讓你建立業務全貌、跟銀行 PM/合規主管溝通時不會像菜鳥的學習材料。

---

## 二、十分鐘看懂業務（先學名詞再看流程）

### 1. 什麼是「加密貨幣」、「區塊鏈」

- **區塊鏈** = 一本「全世界都可以查、誰都改不掉」的帳本
- **加密貨幣** = 這本帳本上記錄的「錢」。最有名的是 BTC（比特幣）、ETH（以太幣）
- **錢包地址** = 你在帳本上的「戶頭號碼」（一串看起來像亂碼的字）
- **私鑰** = 你的「印章」。誰拿到誰就能動裡面的錢，所以**私鑰絕對不能外流**
- **網路（鏈）** = BTC 在 Bitcoin 鏈上、ETH 在 Ethereum 鏈上、USDT 同時存在很多鏈上（TRC20、ERC20）

### 2. 什麼是「加密貨幣交易所」

把它當成「股票證券交易所」就大致對了：

- **撮合**：有人想買 BTC、有人想賣 BTC，系統把他們配對成交
- **訂單簿（order book）**：所有掛單的清單。買方掛在下面、賣方掛在上面
- **K 線**：價格走勢圖（紅色棒子代表這段時間漲；台灣慣例用紅漲綠跌，本 demo 也是）
- **限價單（limit）**：「我願意 BTC 100 萬買、不到不買」
- **市價單（market）**：「現在價多少都買，立刻成交」

兩種交易所型態（本 demo 做的是第一種）：

| 型態 | 例子 | 特色 |
|------|------|------|
| **中心化交易所 CEX** | MAX、BitoPro、Binance、Coinbase | 公司管帳本，要 KYC，可用台幣買幣 |
| **去中心化交易所 DEX** | Uniswap、PancakeSwap | 純鏈上、不用 KYC、無法用法幣 |

### 3. 為什麼交易所要跟銀行合作

法律規定：**用戶的新台幣不能放在交易所手上，必須由銀行受託保管**。

```
    用戶                 交易所                 銀行
   王美玲   ─匯款NTD→     │            ←保管→  信託專戶
            ↓             │                    NTD 餘額
            │            撮合引擎                  │
            │            （只動加密貨幣，         │
            │              不動 NTD）              │
            ↓                                      │
         看到「我的台幣餘額」  ←  讀取  ←  ─────┘
```

- **信託專戶（Trust Account）**：銀行為每位用戶開的虛擬帳號（demo 中是 `8056-2001-...`），用戶匯款進去，銀行記下來
- 交易所只能「請求銀行轉帳」（出金時），**不能直接動用戶的錢**
- **每日對帳**：銀行端紀錄 vs 交易所端紀錄要對得起來，差異要追

這是為什麼 demo 有 bank 端：它不是裝飾，是現實裡真的存在的角色。

### 4. 法規（一句話版）

| 法規 | 你只需要記得 |
|------|------------|
| **洗防法** | KYC 必做、可疑交易要通報。所有交易所都被它管 |
| **VASP 登記制度（2024 起）** | 想做交易所要先向金管會登記 |
| **虛擬資產服務法（預計 2026）** | 把目前散落的規範整合成正式法律 |
| **AML 辦法** | 大額（CTR）、可疑（SAR）的具體報送要求 |

詳細見 `01-regulation.md`。

---

## 三、核心名詞速查表

存著、邊看 demo 邊查。

| 縮寫 | 全名 | 中文 | 簡單說明 |
|------|------|------|---------|
| **KYC** | Know Your Customer | 認識你的客戶 | 上傳身分證 + 自拍，證明你是你 |
| **AML** | Anti-Money Laundering | 反洗錢 | 監測異常交易 |
| **CTR** | Currency Transaction Report | 大額交易報告 | 單筆/累計 ≥ NT$50 萬要報送 |
| **SAR** | Suspicious Activity Report | 可疑交易報告 | 由人工判斷後報送調查局 |
| **VASP** | Virtual Asset Service Provider | 虛擬資產服務業者 | 交易所、錢包服務商等 |
| **CEX / DEX** | Centralised / Decentralised Exchange | 中心化／去中心化交易所 | — |
| **Tier** | — | KYC 分級 | Tier 1 額度小、Tier 2 中、Tier 3 法人/高額 |
| **Fiat** | — | 法幣 | 政府發行的錢，NTD、USD |
| **Stablecoin** | — | 穩定幣 | 1 USDT ≈ 1 USD，價格不波動 |
| **OFAC SDN** | Office of Foreign Assets Control / Specially Designated Nationals | 美國制裁名單 | 命中名單就要立刻凍結 |
| **WORM** | Write Once Read Many | 一次寫入多次讀取 | 稽核日誌特性，不能改 |
| **托管／自託** | Custody / Self-custody | — | 錢交給平台 vs 自己保管私鑰 |

---

## 四、三端逐頁速查（搭配 demo 操作）

下面每個路由可以**直接在 `npm run preview` 後打開來對照**。

### 🟢 Trader 端 `/trader/*`（散戶介面）

**主題色**：深色、活潑（黑底綠字 like 幣安）

| 路由 | 做什麼 | 關鍵業務邏輯 |
|------|-------|-----------|
| `/trader/register` | 建帳號 | Email + 密碼，建立 user record |
| `/trader/login` | 登入 | 支援 2FA（demo TOTP=`123456`） |
| `/trader/kyc` | 身分驗證 | 上傳身分證/自拍，等 admin 審核 |
| `/trader/wallet` | 我的資產 | 看 NTD 餘額 + 加密幣持倉 + 總值 |
| `/trader/wallet/deposit-fiat` | 台幣入金 | **看到專屬虛擬帳號**，按「我已匯款」3 秒後到帳 |
| `/trader/wallet/withdraw-fiat` | 台幣出金 | 從信託餘額代付到綁定銀行帳號 |
| `/trader/wallet/withdraw-crypto` | 加密提領 | 提到外部錢包地址（地址簿 + 鏈選擇） |
| `/trader/markets` | 市場 | 所有幣對行情列表（搜尋、排序、收藏） |
| `/trader/trade/[symbol]` | 交易頁 | **K 線 + 訂單簿 + 下單** 三件套 |
| `/trader/orders` | 我的委託 | 看歷史訂單與狀態 |
| `/trader/orders/trades` | 成交紀錄 | 看實際成交筆數與手續費，可匯出 CSV |
| `/trader/settings` | 設定 | 改密碼、2FA、API key、偏好 |

**Trader 主流程（必做順序）**：

```
註冊 → KYC 上傳 → 等審核 → 通過 → 入金 → 下單 → 持倉 → 賣出 → 出金
```

KYC **沒過** = 什麼都不能做（demo 會 gate）。

詳細：`05-flows-personal-area.md`、`03-flows-money-movement.md`、`04-flows-trading.md`

---

### 🔵 Admin 端 `/admin/*`（交易所內部後台）

**主題色**：淺色、中性（白底深色，like 後台管理系統）

員工分三種角色（demo 都用 `admin` 密碼）：

| 角色 | 帳號 | 主要工作 |
|------|------|--------|
| **compliance**（合規） | `compliance@taiex.local` | 審 KYC、看 AML 警示、覆核出入金 |
| **ops**（營運） | `ops@taiex.local` | 撮合監控、稽核日誌、用戶管理 |
| **risk**（風控） | `risk@taiex.local` | 處理 AML 警示、調整用戶風險等級 |

| 路由 | 做什麼 | 關鍵業務邏輯 |
|------|-------|-----------|
| `/admin/login` | 後台登入 | 三個 demo 帳號可一鍵帶入 |
| `/admin` | Dashboard | 今日交易量 / KYC 待審 / AML 待辦 / 凍結帳戶數 |
| `/admin/kyc` | KYC 審核 | 列表 + 通過/拒絕 + 分派 Tier |
| `/admin/users` | 用戶管理 | 搜尋、篩選、進入詳情可凍結帳戶/調風險 |
| `/admin/risk` | 風控告警 | 處理 AML 警示：誤判 / 升級 SAR / 凍結帳戶 |
| `/admin/orderbook` | 撮合監控 | **跨用戶**訂單簿視角，看到誰掛了大單 |
| `/admin/fiat` | 出入金覆核 | 在 settlement engine 自動推進前可拒絕／暫停 |
| `/admin/audit` | 稽核日誌 | WORM 唯讀、不可改，所有寫入動作都在這 |
| `/admin/reports` | 監管報表 | CTR（自動）+ SAR（人工）的標記送出 |

**Admin 主流程：**
1. 看 dashboard 知道今天有什麼待辦
2. KYC 待審清空 → 用戶才能交易
3. AML 警示處理 → 誤判 or 升級 SAR or 凍結
4. 出金覆核 → 拒絕可疑的、放行正常的
5. 重要動作會在稽核日誌留痕

詳細：`06-flows-admin-ops.md`、`07-flows-admin-compliance.md`

---

### 🟡 Bank 端 `/bank/*`（銀行行員介面）

**主題色**：深綠 + 金色點綴、襯線字體（保守、公文風）

bank 端在本 demo 中**無登入**（簡化）。實務上會用 OAuth 或 IP 白名單對接 VASP。

| 路由 | 做什麼 | 關鍵業務邏輯 |
|------|-------|-----------|
| `/bank` | Dashboard | 信託總額、當日進出、合規待辦 |
| `/bank/trust-accounts` | 信託專戶 | 列出每位客戶的虛擬帳號 + 餘額 + 當月進出 |
| `/bank/kyc-match` | KYC 比對 | 交易所通過後，銀行做**最後實名核對** |
| `/bank/reconciliation` | 對帳中心 | 每日 fiat tx 聚合，標記「需追蹤」 |
| `/bank/aml` | AML 警示 | 同 admin 的警示，但動作不同：**升級 SAR** |
| `/bank/ctr` | CTR 大額 | 自動產生的大額報告，標記送出 |
| `/bank/sar` | SAR 可疑 | 從 AML 升級而來，標記送出 |
| `/bank/regulator-reports` | 監管報送 | CTR + SAR 的概覽 dashboard |

**Bank 主流程：**
1. 收 VASP 送來的 KYC → 比對身分證 / 戶名一致 → 標記通過
2. 每日對帳 → 有差異追蹤
3. 看 AML 警示 → 認定可疑就升級 SAR
4. CTR / SAR draft → 送調查局 → 標記接收

**重要區別**：
- **凍結帳戶** = admin 做的事（交易所責任）
- **送 CTR / SAR** = bank 做的事（對外通報主管機關）

詳細：`08-flows-bank-trust.md`、`09-flows-bank-compliance.md`

---

## 五、一筆錢的完整旅程（最重要的一段）

跟著這個故事走完，整個 demo 就懂了。

**主角**：王美玲（demo 帳號 alice@example.com，已 seed 好的舊客戶）
**金額**：NT$ 600,000（**故意超過 NT$50 萬 CTR 門檻**，看完整鏈路）

```
① 註冊
   王美玲 /trader/register 建立 user record
   ─────────────────────────────────────────
② KYC 送審
   /trader/kyc 上傳身分證 → status='pending'
   ─────────────────────────────────────────
③ 交易所審核
   admin compliance 在 /admin/kyc 看到
   → approve Tier 1
   → AuditLog: actorRole='compliance' action='kyc.approve'
   ─────────────────────────────────────────
④ 銀行比對
   /bank/kyc-match 看到「待比對」
   → 行員確認身分 / 戶名一致
   → POST /api/bank/kyc-match/[id]/verify
   → record.bankVerifiedAt = now
   → AuditLog: actorRole='bank'
   ─────────────────────────────────────────
⑤ 信託專戶開立（demo 中已 seed，實務這步綁定 ④）
   王美玲拿到虛擬帳號 8056-2001-0001-2345
   ─────────────────────────────────────────
⑥ 入金
   王美玲從自己銀行匯 NT$ 600,000 到該虛擬帳號
   /trader/wallet/deposit-fiat 按「我已匯款」
   → settlement engine 3 秒後標記 completed
   → trustAccount.balance += 600,000

   ⚡ 同時觸發：
   ├─ amlStore.appendAlert(large_amount)
   └─ reportStore.createCtrDraft(userId, 600_000, txId, today)
       ↑ 這就是 CTR 自動產生的瞬間
   ─────────────────────────────────────────
⑦ 看到 AML 警示
   admin /admin/risk 看到 large_amount 警示
   bank  /bank/aml 也看到（同一份警示，視角不同）
   ─────────────────────────────────────────
⑧ 升級 SAR
   bank compliance 認為可疑
   → 在 /bank/aml/[id] 填 narrative
   → POST /api/bank/aml/[id]/escalate
   → 建 SAR draft + 標記原警示 resolved=escalated_to_sar
   ─────────────────────────────────────────
⑨ 報送
   bank 在 /bank/ctr 把 CTR draft 標記 submitted
   bank 在 /bank/sar 把 SAR draft 標記 submitted
   → 對應寫入 AuditLog actorRole='bank'
   ─────────────────────────────────────────
⑩ 王美玲下單
   /trader/trade/BTC-TWD 限價單買 0.0001 BTC
   → 撮合引擎找對手單 → 成交
   → 持倉 +0.0001 BTC, 台幣 -X 元
   ─────────────────────────────────────────
⑪ 出金
   /trader/wallet/withdraw-fiat 申請出金 5 萬
   → pending → admin 覆核 OK → 5 秒後 approved
   → 8 秒後 completed
   → 銀行端對帳會看到這筆
   ─────────────────────────────────────────
⑫ 對帳
   /bank/reconciliation 看當日 batch
   → 進金 1 筆 60 萬 + 出金 1 筆 5 萬 + 淨流入 55 萬
```

整個鏈條中，**任何寫入都會在 `/admin/audit` 留痕**——這是合規最重要的能力。

---

## 六、技術架構速覽（給工程師）

| 層 | 用什麼 | 為什麼 |
|---|--------|------|
| 框架 | Nuxt 4 SSR | 檔案路由 + server routes 一站式 |
| 語言 | TypeScript strict + 禁 `any` | 金融專案型別正確性要求高 |
| State | Pinia + `storeToRefs` | Nuxt 官方推薦 |
| Schema | Zod | runtime + 編譯期同時驗證 |
| Style | Tailwind + SCSS | utility 快、SCSS 管 design tokens |
| Chart | lightweight-charts | 交易所 K 線輕量 |
| 資料 | mock in-memory（重啟歸零） | 學習用，不要當真 |
| 三端切換 | `<div data-theme="trader\|admin\|bank">` | CSS 變數 swap |

`shared/types/index.ts` 是 domain model 的唯一真相。每個 entity **同時提供 TypeScript type 與 Zod schema**，兩者必須同步。

---

## 七、後續業務可能要學什麼

公司若要做真實的交易所/區塊鏈網站，技能需求樹（從容易到難）：

### 必備（前端工程師）
- **錢包整合**：MetaMask、WalletConnect — 讓用戶用瀏覽器錢包簽交易
- **鏈上 SDK**：[viem](https://viem.sh)（最現代）/ [ethers.js](https://docs.ethers.org)（最普及）
- **WebSocket 即時資料**：訂單簿/成交價必須毫秒級更新
- **大量數字計算**：用 BigInt 或 [decimal.js](https://mikemcl.github.io/decimal.js/)，**不要用 Number**（精度會壞）

### 業務知識
- **KYC 服務商**：Sumsub、Onfido、TaiwanID — 真實的 KYC 不是自己做
- **鏈上分析**：Chainalysis、Elliptic、TRM Labs — 提供地址風險評分
- **託管**：Fireblocks、BitGo — 多簽錢包、HSM

### 法遵與合規
- **VASP 聲明登記**（金管會）— 想做交易所，公司要先有
- **自律規範**（虛擬通貨商業同業公會）
- **FATF Travel Rule** — VASP 之間轉帳要交換 originator/beneficiary
- **個資法**：KYC 文件 = 高敏感個資

### 進階
- **撮合引擎**：高頻交易需要 µs 級延遲
- **DeFi**：流動性池、AMM、借貸、衍生品
- **跨鏈橋**：UNI、Stargate、LayerZero
- **L2 / Rollup**：Arbitrum、Optimism、zkSync

---

## 八、本文件之外的閱讀順序

讀完這份後，建議按下表深入：

| 想了解 | 看哪份 |
|--------|------|
| 全域總覽（已讀類似） | `00-overview.md` |
| 法規細節 | `01-regulation.md` |
| 業務全流程圖 | `02-business-flows.md` |
| 入金/出金實作 | `03-flows-money-movement.md` |
| K 線、訂單簿、撮合 | `04-flows-trading.md` |
| Trader 設定、API key | `05-flows-personal-area.md` |
| Admin 後台 KYC/用戶 | `06-flows-admin-ops.md` |
| Admin 後台合規/風控 | `07-flows-admin-compliance.md` |
| Bank 信託/比對/對帳 | `08-flows-bank-trust.md` |
| Bank AML/CTR/SAR | `09-flows-bank-compliance.md` |
| **15 分鐘 walkthrough** | `10-demo-guide.md` |
| 上線前資安清單 | `11-security-checklist.md` |

最快建立直覺的方式：

```bash
nvm use && npm run preview
```

打開 `http://localhost:3000`，照 `10-demo-guide.md` 的 12 步走一遍。
看一遍勝過讀十遍。
