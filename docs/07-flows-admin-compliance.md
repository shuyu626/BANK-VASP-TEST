# 07 — 後台合規作業流程

Day 7 把 Admin sidebar 剩下的五個連結補完：風控告警、撮合監控、出入金審核、稽核日誌、監管報表。

---

## Flow X. AML 警示生命週期

```
SYSTEM (settlement engine)               ADMIN (compliance / risk)

Day 3 的大額入金完成
→ amlStore.appendAlert(large_amount)
→ reportStore.createCtrDraft() ← Day 7 新增：AML 與 CTR 聯動
                                       │
                                       ▼
                                 /admin/risk
                                 列表看到 open alert
                                       │
                                 點開 → /admin/risk/[id]
                                 顯示：警示資料、用戶、關聯 tx
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
              誤判結案          升級 SAR          凍結帳戶
                     │                 │                 │
         resolution=          建 SarReport      傳 setUserFrozen(true)
         false_positive       draft（含敘述）      + alert.resolution
         + note               + alert.resolution    = frozen_account
                              = escalated_to_sar
                     │                 │                 │
                     └─────────────────┼─────────────────┘
                                       ▼
                     AuditLog 'aml.alert.resolve' + 對應 action
                     ( user.freeze / 無 / 無 )
```

---

## Flow Y. 撮合監控的跨用戶視角

```
ADMIN                                    SERVER

/admin/orderbook ──────────▶ GET /api/admin/orderbook/BTC-TWD
(symbol dropdown)
                             ├─ 底層 buildOrderBook (同 trader 看到的)
                             ├─ 外加 getAllOrders 過濾 symbol + open + limit
                             ├─ enrich each order with user info (id/displayName)
                             └─ 計算 isLarge (notional ≥ 1,000,000 TWD)

Trader 端（/trader/trade/...）
只看到自己的 limit orders 合併進訂單簿，看不到 price level 的 owner

Admin 端
看到每筆 open limit 的 owner + 大單高亮（warning bg）
```

每 3 秒自動 refresh。admin 目前不能直接從這裡撤單，需要走其他路徑（凍結用戶、或通知用戶）。

---

## Flow Z. 出入金人工覆核

Day 3 的 settlement engine 是「時間到就自動完成」，Day 7 引入 override：

```
出金 pending → (5s) → approved → (3s) → completed

admin 可以在 pending 或 approved 狀態按「覆核拒絕」：
  POST /api/admin/fiat/withdrawals/:id/reject
  body: { reason: 'suspicious pattern' }
  ├─ withdrawal.status = 'rejected'
  ├─ withdrawal.rejectReason = ...
  └─ 當 settlement engine 的 setTimeout 到期時，檢查 status !== expected
     → skip completion

入金 pending → (3s) → completed

admin 可以在 pending 狀態按「暫停待審」：
  POST /api/admin/fiat/deposits/:id/hold
  ├─ deposit.status = 'reviewing'
  └─ settlement engine 的 timer 看到 status !== 'pending' → skip

然後 admin 可以：
  POST /api/admin/fiat/deposits/:id/release → 立即 completed + balance adjust

或從後台手動拒絕（Day 7 範圍外，可手動 update DB）。
```

---

## Flow AA. 稽核日誌的唯讀查詢

```
/admin/audit
篩選：actorRole / action 前綴 / actor 具體 ID / resourceId / since date
分頁（demo：limit 100, max 500）
                                       │
GET /api/admin/audit?actorRole=compliance&action=kyc.
                                       │
回傳：traderStore.getAuditLog()
      .filter(actorRole === 'compliance')
      .filter(action.startsWith('kyc.'))
      .sort(timestamp desc)
      .slice(0, limit)

UI 每筆可展開，看 metadata JSON。

⚠️ 不提供 delete / update — 稽核日誌設計上就是 append-only。
```

---

## Flow BB. CTR / SAR 自動化與送報

```
入金 NT$600,000 completed ────▶ amlStore.appendAlert(large_amount)
                              ────▶ reportStore.createCtrDraft({
                                      userId, amount: 600000,
                                      txId, date: '2026-04-24'
                                    })

如果同一 user 同一天再來一筆 NT$500,000：
   → findDraft(userId, date) 存在
   → 加入 txId、totalAmount += 500,000
   → 不新建 draft

/admin/reports CTR tab：
  看到 draft 列表（Day 7 seed 1 筆 + 自動衍生的）
  「標記已報送」→ status='submitted', submittedAt=now
  AuditLog 'report.ctr.submitted'

/admin/reports SAR tab：
  從 /admin/risk 升級而來（Flow X 的 escalate_to_sar 分支）
  每筆可展開看完整 narrative
  「標記已報送」→ status='submitted'
  AuditLog 'report.sar.submitted'
```

Day 9 銀行端對應的頁面會是同樣 read-only 視角（銀行端自己的 CTR），是兩個獨立的資料來源：
- 交易所端（本 Day 7）：以交易所內部交易為主
- 銀行端（Day 9）：以信託帳戶進出為主（通常金額一致、紀錄獨立）

---

## Demo 劇本（Day 7）

```
[R1] Admin 登入（compliance@taiex.local / admin）

[R2] /admin/risk → 看到已有 3+ 個 open alerts
     (Day 3 的 aml_002 blacklist_hit critical)
     (Day 3 mockAmlAlerts aml_001 large_amount high)
     點 critical 那筆 → 凍結帳戶 → 回列表看到已結案
     → /admin/users/u_004 已凍結（已在 mock seed 凍結，這裡驗證路徑）

[R3] /admin/orderbook → BTC/TWD
     若有 alice 的 open limit 單 → 看到 owner=王美玲

[R4] /admin/fiat → 出金 tab
     若 pending/approved 的出金 → 「覆核拒絕」輸入原因

[R5] /admin/audit → actorRole=compliance
     看到 kyc.approve / user.freeze / aml.alert.resolve 等
     展開看 metadata

[R6] /admin/reports → CTR tab
     有 Day 3 觸發的 large_amount 對應 draft (ctr_auto_XXX)
     「標記已報送」→ 狀態變 submitted
     → /admin/audit 看到 report.ctr.submitted
```

---

## 後續 Day 8+ 對接

- Day 8 Bank `/bank/reconciliation` 會讀 `FiatDeposit.bankReference` + `FiatWithdrawal.bankReference` 做對帳
- Day 8 Bank `/bank/trust-accounts` 會讀 trust balance 聚合
- Day 9 Bank `/bank/aml` 會讀 `amlStore` 但只關注銀行端相關類型（目前只有 large_amount）
- Day 9 Bank `/bank/ctr` 會讀 `reportStore.listCtr()` 但以銀行視角重新 filter / 加工
