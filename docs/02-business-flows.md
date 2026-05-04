# 02 — 業務流程圖（第一版）

這份展示 Day 2 範圍內（註冊 → KYC → 登入）的流程，含三端協作與合規引用。後續 Day 3+ 會補上入金 / 出金 / 交易 / 風控觸發 / 稽核等流程。

圖例：

```
[ Trader UI ]  ─▶  使用者可見的前台頁面
{ Admin Ops }  ─▶  交易所後台操作
« Bank Ops »   ─▶  銀行承辦操作
[[ 法源 ]]     ─▶  對應法規條文
```

---

## Flow A. 註冊 + KYC + 開立信託專戶

```
USER                     TRADER UI                      SERVER (VASP)                    BANK OPS
────                     ──────────                      ──────────────                    ─────────

填寫 Email/             [/trader/register]
密碼 ────────────▶      送出註冊 ───────────▶   POST /api/trader/auth/register
                                                │
                                                ├─ Zod 驗證輸入
                                                ├─ 檢查 email 重複
                                                ├─ 建立 User
                                                │  (kycStatus: pending)
                                                └─ 發 session cookie
                                                │
                        redirect → /trader/kyc ◀┘
                        ┌─────────────────────┐
                        │ [/trader/kyc]        │
                        │  上傳：              │
                        │  - 身分證正面        │
                        │  - 身分證反面        │
                        │  - 本人自拍          │
                        │  - 地址證明（選填）  │
                        │  + 填寫姓名、身分證、│
                        │    生日、電話、地址  │
                        │  + 法源折疊面板      │
                        └──────────┬──────────┘
                                   │ 送出
                                   ▼
                        POST /api/trader/kyc/submit
                        │
                        ├─ Zod 驗證
                        ├─ 身分證字號 → 末四碼（****XXXX）
                        ├─ 建立 KycRecord (pending, tier0)
                        └─ 更新 user.kycStatus: pending
                        │
                                          [[ 洗防法 §7 客戶審查 ]]
                                          [[ AML 辦法 §5 ]]
                                   ▼
                        { Admin: /admin/kyc }
                                   │
                                   ├─ 審核員核對文件 vs 資料
                                   ├─ （示意）向銀行請求實名比對
                                   │       │
                                   │       ▼
                                   │   « Bank: /bank/kyc-match »
                                   │   實名制系統比對
                                   │   ├─ 一致 → 回傳 verified
                                   │   └─ 不一致 → 拒絕 + 備註
                                   │
                                   ├─ 審核通過
                                   │  ├─ user.kycStatus: approved
                                   │  ├─ user.kycTier: tier1
                                   │  └─ 觸發信託專戶建立
                                   │       │
                                   │       ▼
                                   │   « Bank: 開立信託虛擬帳號 »
                                   │   ├─ 建立 TrustAccount（vaspId, userId）
                                   │   ├─ 分配虛擬帳號（例：8056 2001 XXXX XXXX）
                                   │   └─ 回傳至交易所
                                   │
                                   └─ 通知使用者（Day 3 會加 email mock）
                                   │
                        [/trader/wallet] ◀─┘
                        可看到信託專戶 + 虛擬帳號
                        入金 / 出金 / 交易按鈕由 disabled 變為 enabled
```

### 合規引用

- 「身分證字號只保留末四碼」→ **個資法最小化原則** + 自律規範
- 「不一致 → 拒絕」→ 洗防法 §7 客戶審查不實的拒絕義務
- 「信託專戶」→ **銀行法 §28 + 信託業法 客戶資產隔離**
- 「稽核紀錄」→ 每個步驟寫入 `AuditLog`（Day 6+ 銜接 `/admin/audit`）

---

## Flow B. 登入（無 2FA）

```
USER              TRADER UI                    SERVER

輸入 Email/      [/trader/login]
密碼 ─────▶      送出 ───────▶    POST /api/trader/auth/login
                                   │
                                   ├─ Zod 驗證
                                   ├─ 查 user by email
                                   ├─ 比對 password
                                   │  └─ 不一致 → 401 INVALID_CREDENTIALS
                                   ├─ 檢查 twoFaEnabled: false
                                   ├─ 建立 session
                                   └─ 發 session cookie
                                   │
                 redirect → /trader/wallet ◀┘
                 （若有 ?redirect= 參數則導向該路徑）
```

## Flow B'. 登入（開啟 2FA）

```
USER              TRADER UI                    SERVER

輸入 Email/      [/trader/login]
密碼 ─────▶      送出 ───────▶    POST /api/trader/auth/login
                                   │
                                   ├─ 密碼通過
                                   ├─ twoFaEnabled: true
                                   ├─ 建立 TOTP challenge（challengeId）
                                   └─ 回傳 { step: 'totp_required', challengeId }
                                   │
                 顯示 TOTP 輸入框 ◀┘
                 （不送 cookie，不建 session）
                 │
輸入 6 碼 ──▶   送出 ───────▶    POST /api/trader/auth/login/totp
                                   │
                                   ├─ 解析 challengeId
                                   ├─ 比對 code vs '123456'
                                   │  └─ 不一致 → 401 WRONG_TOTP
                                   ├─ 建立 session
                                   └─ 發 session cookie
                                   │
                 redirect → /trader/wallet ◀┘

⚠️ 本 demo TOTP 為 MOCK，不是真的 RFC 6238。
   login 頁面輸入框上明確標示「Mock TOTP (123456)」。
```

### 合規引用

- 「密碼錯誤不透露哪裡錯」→ OWASP A07 認證失敗資訊洩漏
- 「2FA 驗證獨立於密碼驗證」→ 自律規範鼓勵 MFA
- 真正的 TOTP 應走 RFC 6238（HMAC-SHA1 based）→ Day 10+ 深化

---

## Flow C. Session 持久化（刷新頁面）

```
BROWSER REFRESH
│
├─ Cookie `trader_sid` 自動帶上
▼
Nuxt middleware: trader-auth.global.ts
│
├─ 呼叫 session.init()
│  └─ GET /api/trader/auth/me
│     ├─ 讀 cookie
│     ├─ 找 session in Map
│     └─ 回傳 { session }
├─ 更新 Pinia store
└─ 判定路徑權限：
   ├─ 已登入 + 已 KYC → 可去任何 /trader/* 路徑
   ├─ 已登入 + 未 KYC → 限 /trader/kyc, /trader/wallet
   ├─ 未登入 + /trader/login 或 /trader/register → 允許
   └─ 未登入 + 其他 → redirect to /trader/login?redirect=...
```

⚠️ **MVP 限制**：in-memory session store 在 Nitro 重啟後會全部消失。
`npm run build` 會觸發重啟，所以 demo 劇本需「build 完先註冊再操作」。

---

## Flow D. Route Guard 決策表

| 請求路徑 | isAuthenticated | kycStatus | 動作 |
|---------|-----------------|-----------|------|
| `/trader/login` | false | — | 允許 |
| `/trader/login` | true | — | 導向 `/trader/wallet` |
| `/trader/register` | false | — | 允許 |
| `/trader/register` | true | — | 導向 `/trader/wallet` |
| `/trader/kyc` | false | — | 導向 `/trader/login?redirect=...` |
| `/trader/kyc` | true | any | 允許 |
| `/trader/wallet` | false | — | 導向 `/trader/login?redirect=...` |
| `/trader/wallet` | true | any | 允許（wallet 本身已處理 KYC 未通過的展示） |
| `/trader/trade/*`（Day 4） | false | — | 導向 login |
| `/trader/trade/*` | true | ≠ approved | 導向 `/trader/kyc` |
| `/trader/trade/*` | true | approved | 允許 |

---

## Demo 劇本（Day 2 範圍）

```
[D1] 從 http://localhost:3000/ → 點「進入 Trader」
[D2] 點右上「註冊」→ 填 Email/顯示名稱/密碼 → 送出
     （或點「一鍵填入示範資料」→ 送出）
[D3] 自動跳轉 /trader/kyc → 填資料 → 上傳 3 份文件 → 送出
[D4] 看到 pending 狀態 badge（warning 色）
[D5] 點右上使用者選單 → 登出
[D6] 回到 /trader/login → 點「使用 Demo 帳號」→ 登入 alice
     alice 有 kycStatus: approved、Tier 2，信託餘額 NT$284,500
[D7] 看到 /trader/wallet 有 Fiat NT$284,500 + BTC/ETH/USDT 持倉
[D8] 24h 漲跌用紅／綠呈現（紅漲綠跌 Taiwan 慣例）
[D9] 所有 Fiat/Crypto 動作按鈕為 enabled（因為 Alice 已 KYC 通過）
[D10] 試登出 → 用 charlie 登入 → 填 TOTP 123456 → 登入成功
      （charlie: twoFaEnabled=true, Tier 3）
```
