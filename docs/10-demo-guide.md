# 10 — Demo 腳本

15-20 分鐘的完整 demo 路徑，從 trader 端註冊一路走到銀行端 CTR 報送。
適合用於：與銀行 PM、合規主管、稽核會議的 walkthrough。

```
nvm use            # Node 22
npm run build      # 必要：本專案路徑含空格與中文，dev mode 觸發 Nuxt vite-node IPC bug
npm run preview    # → http://localhost:3000
```

---

## 演員與帳號

| 角色 | 帳號 | 密碼 | 場景 |
|------|------|------|------|
| Trader | `alice@example.com` | `password` | 已通過 KYC、有信託餘額 |
| Trader | `bob@example.com` | `password` | KYC pending |
| Trader | `charlie@example.com` | `password` | 高風險、Tier 3、有 2FA（TOTP=`123456`） |
| Trader | `diana@example.com` | `password` | KYC rejected、已凍結 |
| Admin（合規） | `compliance@taiex.local` | `admin` | 審 KYC、看 AML、出入金覆核 |
| Admin（營運） | `ops@taiex.local` | `admin` | 撮合監控、稽核日誌 |
| Admin（風控） | `risk@taiex.local` | `admin` | 同合規 + 處理 AML |
| Bank | （免登入） | — | 公開 demo 視角 |

---

## Demo 路徑（建議順序）

### 0. 三端入口（30 秒）
- 開 `/` 看三端介紹卡片
- 點不同卡片切換到 trader / admin / bank

### 1. Trader：註冊與 KYC（3 分鐘）
1. `/trader/register` 隨意建立新帳號
2. 自動轉到 `/trader/kyc` 上傳身分文件（隨意 PDF/JPG，size < 5 MB）
3. 提交後狀態轉為 `pending`
4. 切到 `/trader/wallet`，看到 KYC gate banner（尚未通過時無法入金）

### 2. Admin：審 KYC（2 分鐘）
1. `/admin/login` 用 `compliance@taiex.local` / `admin`
2. `/admin/kyc` 看到剛才那筆 `pending`，點 → `approve` Tier 1
3. AuditLog 寫入 `kyc.approve` 由 actorRole='compliance'

### 3. Bank：KYC 比對（1 分鐘）
1. 切到 `/bank/kyc-match`（公開訪問）
2. 看到剛通過的 KYC，狀態為「待比對」
3. 點 → 看身分資料、綁定銀行、按「標記比對通過」
4. AuditLog 寫入 `kyc.bank.verify` 由 actorRole='bank'

### 4. Trader：入金 → 觸發 CTR（3 分鐘）
1. 回到原 trader 帳號 `/trader/wallet`
2. 點「台幣入金」→ 輸入 **600,000**（超過 NT$50 萬 CTR 門檻）
3. 按「我已匯款」
4. 3 秒後狀態變 `completed`，餘額更新
5. 同時：
   - `amlStore.appendAlert(large_amount)` 自動觸發
   - `reportStore.createCtrDraft(...)` 自動建 CTR 草稿

### 5. Admin：看到 AML 警示（1 分鐘）
1. 切回 admin tab
2. `/admin/risk` 看到剛才觸發的 large_amount 警示
3. 也可以到 `/admin/reports` → CTR 看到自動建立的 draft
4. （示範完不要 resolve，留給銀行端升級 SAR）

### 6. Bank：升級 SAR（2 分鐘）
1. 切到 `/bank/aml`
2. 點剛剛的 large_amount 警示
3. 填寫 SAR 敘述（最少 20 字）：
   > 「客戶於單日內入金達 NT$60 萬，超過 CTR 門檻，且該客戶 KYC 通過後僅 5 分鐘即進行大額入金，行為模式可疑，建議調查局審視資金來源。」
4. 按「升級為 SAR」
5. 自動跳轉到 `/bank/sar`，看到 draft

### 7. Bank：CTR + SAR 報送（1 分鐘）
1. `/bank/ctr` → draft 狀態的 CTR，按「送出」
2. `/bank/sar` → draft 狀態的 SAR，按「送出」
3. `/bank/regulator-reports` 看到統計與近期送辦紀錄

### 8. Trader：交易（2 分鐘）
1. 回 trader（用 alice）`/trader/markets`
2. 看 BTC/TWD 行情，紅漲綠跌（台灣慣例）
3. 點進交易頁，K 線 + 訂單簿 + 下單
4. 下個小單 buy 0.001 BTC
5. 即時看到撮合與餘額變化

### 9. Trader：出金（1 分鐘）
1. `/trader/wallet` → 點「台幣出金」
2. 選綁定的銀行帳號 → 輸入金額 → 確認
3. 狀態：pending → approved → completed（共約 8 秒）

### 10. Admin：覆核拒絕示範（1 分鐘）
1. 切到 admin
2. `/admin/fiat` 出金清單 → 選一筆 pending → 「覆核拒絕」（填原因）
3. 該筆狀態變 rejected，settlement engine 不會繼續推進

### 11. 對帳閉環（1 分鐘）
1. `/bank/reconciliation`
2. 看到當日對帳：進金 X 筆、出金 Y 筆、淨流入 Z
3. 點進今日 → 看到所有 fiat tx 列表

### 12. 稽核日誌（30 秒）
1. `/admin/audit` 篩選 `actorRole=bank`
2. 看到今天 bank 端的所有寫入動作
3. 展開任一筆，看 metadata（包含 narrative、resolution 等）

---

## 關鍵閉環檢核

整個 demo 的 8 步閉環（同 plan 規格）是否走完：

- [x] **註冊 → KYC → admin 審核**（步驟 1, 2）
- [x] **bank 收到 KYC 比對請求 → 通過**（步驟 3）
- [x] **trader 入金（虛擬帳號）**（步驟 4）
- [x] **bank 對帳中心顯示**（步驟 11）
- [x] **trader 下單 → 撮合**（步驟 8）
- [x] **trader 出金 → admin 覆核**（步驟 9, 10）
- [x] **AML 觸發 → SAR 升級**（步驟 4, 6, 7）
- [x] **AuditLog 紀錄**（步驟 12）

---

## 已知限制

- 所有資料皆為 mock，**重啟 server 後狀態歸零**（in-memory store）
- bank 端無 session 驗證（簡化）
- 沒有真實鏈上交易、沒有真實匯款、沒有真實銀行 API 串接
- 撮合引擎是 mock-light，僅模擬 limit order 撮合過程
- KYC 上傳的檔案不會真的儲存（只記錄 filename / size / mimeType）

完整資安檢核見 `11-security-checklist.md`。
