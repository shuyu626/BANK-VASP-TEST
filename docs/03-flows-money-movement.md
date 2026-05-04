# 03 — 金流動線（Day 3 範圍）

本篇接續 `02-business-flows.md`。Day 2 把使用者送進 wallet 後，資金動不了；
Day 3 把三條金流動線跑起來：**台幣入金、台幣出金、加密提領**。

---

## Flow D. 台幣入金（首次入金）

延續 Flow A 的 KYC 通過＋信託專戶已開立的前提。

```
USER                  TRADER UI                       SERVER                          BANK (信託)

[/trader/wallet]     點「台幣入金」→
                     [/trader/wallet/deposit-fiat]
                     ├─ 顯示虛擬帳號 8056 2001 XXXX XXXX
                     ├─ 顯示銀行代碼 805 / 戶名（使用者）
                     └─ 顯示今日剩餘額度
                                    │
 (實際上 user 會離開瀏覽器去網銀匯款，但 demo 簡化為按鈕)
                                    │
按「模擬匯款」 ────▶ POST /api/trader/fiat/deposits
                     │  ├─ Zod 驗證
                     │  ├─ 額度檢查（KYC_TIER_LIMITS × 當日累積）
                     │  │  └─ 超過 → 422 LIMIT_EXCEEDED
                     │  ├─ 建立 FiatDeposit(pending)
                     │  ├─ 寫 AuditLog 'fiat.deposit.request'
                     │  └─ scheduleFiatDeposit(id)  ← setTimeout 3s
                     │
UI 插入 pending 列 ◀─┘
                     │
 (等 3 秒 + 自動 polling)
                                    ▼
                     settlement-engine: 3 秒後
                     ├─ status: pending → completed
                     ├─ bankReference: BR<RAND>
                     ├─ adjustFiatBalance(+amount)
                     ├─ AuditLog 'fiat.deposit.complete'
                     └─ checkDepositAmlThreshold()
                        │
                        ├─ 單筆 ≥ NT$500,000 → 建立 AmlAlert
                        └─ 日累積 ≥ NT$500,000 → 建立 AmlAlert

wallet.refresh 看到
新餘額與 completed 狀態
```

合規觸點：
- **洗防法 §8（CTR 門檻）** → `checkDepositAmlThreshold` 寫入 `aml-store`
- **銀行法 §28（信託隔離）** → 虛擬帳號隸屬信託專戶，不進公司自有資金
- Day 8 的 `/bank/reconciliation` 會從這個 `FiatDeposit` 讀 `bankReference` 做對帳

---

## Flow E. 台幣出金（含凍結機制）

```
USER                  TRADER UI                       SERVER

[/trader/wallet]     點「台幣出金」→
                     [/trader/wallet/withdraw-fiat]
                     │
                     選擇已驗證銀行帳號 + 填金額
                     ├─ 手續費預覽 NT$ 15
                     ├─ 實際到帳 = 金額 - 15
                     └─ 顯示今日／本月剩餘額度
                                    │
按「下一步」 ──▶     顯示確認 modal（銀行/帳號/金額/手續費）
                                    │
按「確認送出」 ──▶  POST /api/trader/fiat/withdrawals
                     │  ├─ Zod 驗證
                     │  ├─ 銀行帳號檢查（isVerified）
                     │  ├─ 餘額檢查（balance - frozen ≥ amount + fee）
                     │  ├─ 日／月額度檢查
                     │  ├─ 建立 FiatWithdrawal(pending, fee=15)
                     │  ├─ AuditLog 'fiat.withdraw.request'
                     │  └─ scheduleFiatWithdraw(id)
                     │
UI 顯示凍結金額 ◀────┘ (pending 與 approved 的 amount+fee 會加到 frozenTwd)
可用餘額 = balance - frozen
                                    ▼
                     settlement-engine: 5 秒後
                     ├─ status: pending → approved
                     ├─ approvedBy: 'mock-reviewer'
                     ├─ AuditLog 'fiat.withdraw.approve'
                     └─ (ts+3s) 內部再推進一次
                                    ▼
                     settlement-engine: 再 3 秒後
                     ├─ status: approved → completed
                     ├─ adjustFiatBalance(-(amount+fee))
                     ├─ AuditLog 'fiat.withdraw.complete'
                     └─ checkWithdrawAmlThreshold()

總時程：8 秒走完 pending → approved → completed
```

Timeline 顯示：
| 狀態 | 意義 | UI |
|------|------|----|
| pending | 等待覆核 | 黃色 badge |
| approved | 內部已核准，等銀行代付 | 黃色 badge + approvedBy/approvedAt |
| completed | 銀行已代付 | 綠色 badge + completedAt |

凍結邏輯：出金 pending + approved 期間，`fiatAvailable = balance - frozen`，使用者看到
可動資金會減少。completed 時 balance 實際扣除，frozen 歸零。

---

## Flow F. 加密貨幣提領（含白名單與安全倒數）

```
USER                  TRADER UI                                    SERVER

[/trader/wallet]     點「提領加密資產」→
                     [/trader/wallet/withdraw-crypto]
                     │
                     ┌──────────── 地址通訊錄 ────────────┐
                     │ 若沒有地址 →                       │
                     │   輸入地址 + 標籤（選填）             │
                     │   POST /crypto/address-book ───────▶ addAddressBookEntry(addedAt: now)
                     │   ← 回傳 entry                     │
                     │                                   │
                     │ 新地址立即變成「冷卻中」：           │
                     │   UI 倒數 30 秒                    │
                     │   冷卻期間選項 disabled           │
                     └───────────────────────────────────┘
                     │
選擇地址 + 數量 ─▶   按「確認提領」
                     │
                     ┌────────── 60 秒安全倒數 ───────────┐
                     │ 倒數期間：                         │
                     │ • 顯示剩餘秒數                       │
                     │ • 可以按「取消倒數」                 │
                     │ • 「送出」按鈕 disabled             │
                     │                                   │
                     │ 倒數歸零：                         │
                     │ • 「送出」按鈕 enabled              │
                     └───────────────────────────────────┘
                     │
按「送出提領」 ──▶   POST /api/trader/crypto/withdrawals
                     │  ├─ Zod 驗證
                     │  ├─ 手續費查表（TRANSFER_FEES.cryptoWithdraw[asset]）
                     │  ├─ 地址冷卻檢查（≥ 30s）
                     │  │  └─ 未滿 → 422 ADDRESS_COOLDOWN
                     │  ├─ 持倉檢查（amount + fee ≤ holding）
                     │  ├─ 建立 CryptoWithdrawal(pending)
                     │  ├─ AuditLog 'crypto.withdraw.request'
                     │  └─ scheduleCryptoWithdraw(id)
                     │
UI 顯示「已送出」 ◀──┘
                                    ▼
                     settlement-engine: 10 秒後
                     ├─ status: pending → completed
                     ├─ 產生 txHash = 'tx_mock_<rand>'
                     ├─ adjustHolding(asset, -(amount + fee))
                     └─ AuditLog 'crypto.withdraw.complete'

紀錄列表顯示
txHash（可複製）
```

安全層設計對照：

| 風險 | Demo 對應機制 | 真實世界對應 |
|-----|-------------|------------|
| 使用者打錯地址 → 永久失去資產 | 地址通訊錄 + 第一次使用的冷卻 | 24 小時鎖定 + email 確認 |
| 帳號被盜 → 駭客瞬間提領 | 60 秒倒數 + 可取消 | 24/48 小時延遲 + 多簽 + 風控掃描 |
| 提領地址命中黑名單 | Day 9 會加（本 Day 3 範圍外） | OFAC / UN 制裁名單比對 |

---

## Flow G. AML 大額觸發（背景）

三條動線的 settlement engine 在推進到 completed 時，會檢查是否觸發門檻：

```
deposit.complete   ┐
withdraw.complete  ├──▶  amount ≥ NT$500,000?
                   │        │
                   │        ├─ 是 → amlStore.appendAlert(large_amount, high)
                   │        │
                   │        └─ 否 → 查當日累積 total
                   │                 │
                   │                 ├─ ≥ NT$500,000 → appendAlert（aggregated）
                   │                 └─ < 門檻 → 無動作
                   │
(crypto.complete 不觸發本規則 — 加密提領的風控在 Day 9 加上地址黑名單比對)
```

**警示對 Trader 完全不可見**（這是設計，不是 bug）：
- `/api/trader/*` 不會回傳任何 aml 資料
- 唯一可以看到警示的是 Day 7 `/admin/risk` 與 Day 9 `/bank/aml`, `/bank/sar`

合規依據：**洗防法 §8 + §9**，虛擬通貨 AML 辦法 §9。

---

## Demo 劇本（Day 3 範圍）

前置：已用 `alice@example.com / password` 登入（KYC approved, Tier 2, 信託餘額 NT$284,500）。

```
[T1] /trader/wallet → 看到新的按鈕全部可點
[T2] 按「台幣入金」→ /trader/wallet/deposit-fiat
     虛擬帳號: 8056 2001 0001 2345
     模擬金額 50000 → 送出 → 3 秒後餘額變 NT$334,500 ✓

[T3] 按「台幣入金」再試一次 → 金額 600000
     → 立刻 422 LIMIT_EXCEEDED（超過 Tier 2 日入金 NT$3,000,000？NO，這是 OK 的）
     → 應該通過，3 秒後餘額變 NT$934,500
     → 而且 aml-store 追加一筆 large_amount alert（背景，UI 看不到）

[T4] 返回 /trader/wallet → 按「台幣出金」→ /trader/wallet/withdraw-fiat
     選擇「805 · 東東商銀」帳號 → 金額 20000 → 下一步
     確認 modal 顯示：實際到帳 NT$ 19,985
     按「確認送出」
     → 看到凍結 NT$ 20,015，可用餘額減少
     → 5 秒後 approved，8 秒後 completed，balance 扣除

[T5] 返回 /trader/wallet → 按「提領加密資產」→ /trader/wallet/withdraw-crypto
     選擇 BTC
     通訊錄空白 → 新增地址 `bc1qdemoaddress1234`
     嘗試選擇 → 看到「冷卻中 30s」
     等 30 秒後變「可用」
     輸入數量 0.01 → 按「確認提領」
     → 60 秒倒數開始
     → 等倒數完，按「送出」
     → 10 秒後狀態變 completed，BTC 持倉減少 0.01 + 0.0002
```

---

## 後續 Day 4+ 如何用到 Day 3 的資料

| Day | 使用 | 使用方式 |
|-----|-----|---------|
| Day 6 Admin | `FiatWithdrawal` + `FiatDeposit` | `/admin/fiat` 列出所有覆核中項目，可手動改 approved/rejected（取代 settlement-engine 自動推進） |
| Day 7 Admin | `AmlAlert` | `/admin/risk` 顯示所有未解決警示 |
| Day 8 Bank | `FiatDeposit.bankReference` | `/bank/reconciliation` 比對交易所與銀行端匯款紀錄 |
| Day 9 Bank | `AmlAlert` (large_amount) | `/bank/aml`、`/bank/ctr` 以門檻生成 CTR 草稿 |
| Day 10 整合 | 所有 AuditLog | `/admin/audit` WORM 日誌檢視 |
