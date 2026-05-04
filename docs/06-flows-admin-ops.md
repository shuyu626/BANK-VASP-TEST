# 06 — 交易所後台操作流程（Day 6 範圍）

Day 6 讓 Admin 有實際可操作的三個核心頁面：Dashboard / KYC 審核 / 用戶管理。

---

## Flow S. Admin 登入與雙 session

```
BROWSER (已登入 alice trader)
│
在新 tab 開 /admin/login
│
middleware: admin-auth.global
├─ admin-session.init() → GET /api/admin/auth/me
│  └─ 無 admin_sid cookie → 401 → anonymous
└─ path === '/admin/login' → allow

使用者一鍵「合規審核員」→ email & password 填入
送出 ─▶ POST /api/admin/auth/login
        ├─ 檢查 adminStore.findByEmail
        ├─ 比對 password
        ├─ createSession → admin_sid cookie
        └─ AuditLog 'admin.login'
│
redirect → /admin （由 middleware 處理）

[此時瀏覽器同時持有：]
  trader_sid (alice)
  admin_sid  (admin_01)

/api/trader/auth/me  → 回 alice
/api/admin/auth/me   → 回 admin_01
```

Trader 頁面與 Admin 頁面完全獨立運作，互不干擾。

---

## Flow T. Dashboard 資料來源

```
GET /api/admin/dashboard  (requireAdmin)

聚合來源：
├─ today.tradingVolumeTwd  = sum(allTrades where timestamp==today × price)
│                           (USDT 幣對換算為 TWD 以 USDT/TWD 匯率 mockMarketsTwd)
├─ today.newUsers          = users.filter(createdAt startsWith today).length
├─ today.fiatInboundTwd    = completedDeposits.filter(today).sum(amount)
├─ today.fiatOutboundTwd   = completedWithdrawals.filter(today).sum(amount)
├─ counts.pendingKyc       = kycRecords.filter(status='pending').length
├─ counts.openAmlAlerts    = amlStore.listOpen().length
├─ counts.frozen           = users.filter(isFrozen).length
├─ counts.totalUsers       = users.length
└─ recentActivity          = auditLog.sort(desc).slice(0, 20)

每次 admin 按「重新整理」都即時計算。
```

---

## Flow U. KYC 審核閉環

### 通過

```
TRADER                   ADMIN                                SERVER / 資料影響

/trader/kyc             [/admin/kyc] 列表 待審
上傳文件 →              看到 bob 的 pending 紀錄
（見 Day 2 Flow A）          │
                        點開 /admin/kyc/[id]
                        選 Tier 1 → 通過
                                      │
                        POST /api/admin/kyc/:id/approve
                        body: { tier: 'tier1' }
                                      │
                        ├─ kycRecord.status='approved'
                        ├─ kycRecord.reviewerId=admin_01
                        ├─ user.kycStatus='approved'
                        ├─ user.kycTier='tier1'
                        ├─ 若無 trustAccount:
                        │    createTrustAccount({ virtualAccountNumber })
                        └─ AuditLog 'kyc.approve'
                        │
bob 刷新 wallet                       ──▶
看到信託專戶成立、
可以入金出金了
```

### 拒絕

```
ADMIN
  /admin/kyc/[id] → 「拒絕」
  輸入原因 "身分證影像模糊"
                        │
POST /api/admin/kyc/:id/reject
body: { reason: '身分證影像模糊' }
                        │
├─ kycRecord.status='rejected'
├─ kycRecord.rejectReason=...
├─ user.kycStatus='rejected'
└─ AuditLog 'kyc.reject'
                        │
TRADER /trader/kyc 顯示「未通過 + 原因」
可重新送件
```

---

## Flow V. 用戶凍結 → Trader 動作被擋

```
ADMIN
  /admin/users/u_alice  → 「凍結帳戶」
                        │
POST /api/admin/users/u_alice/freeze
body: { frozen: true, reason: 'admin console' }
                        │
├─ user.isFrozen = true
└─ AuditLog 'user.freeze'
                        │
TRADER
alice 下次呼叫：
  POST /api/trader/orders         → 403 ACCOUNT_FROZEN
  POST /api/trader/fiat/deposits  → 403 ACCOUNT_FROZEN
  POST /api/trader/fiat/withdrawals  → 403 ACCOUNT_FROZEN
  POST /api/trader/crypto/withdrawals → 403 ACCOUNT_FROZEN

（已登入 session 不會立即失效 — 查詢仍可用；設計上接受，真實世界
 會在 gateway 強制 logout）

解凍：同一介面「解凍帳戶」→ AuditLog 'user.unfreeze'
```

---

## Flow W. 風險等級調整

```
ADMIN
  /admin/users/u_bob → 風險等級 low → high
  備註："velocity alert from Day 3"
                        │
POST /api/admin/users/u_bob/risk
body: { level: 'high', note: 'velocity alert from Day 3' }
                        │
├─ user.riskLevel = 'high'
└─ AuditLog 'user.risk.change'
  metadata: { level, note }

Day 7 的 /admin/risk 會優先顯示 high / critical 用戶
```

---

## Demo 劇本（Day 6）

```
[A1] 新 tab 開 /admin/login → 一鍵「合規審核員」→ 登入
     → dashboard 看到 KPIs

[A2] /admin/kyc → 待審 tab
     看到 bob 的 pending 紀錄
     （若沒有：回 trader 開 bob 帳戶 → 送 KYC）
     點開 → 選 Tier 1 → 通過
     → bob kycStatus='approved'、trust account 建立
     → 回 /trader 用 bob 帳號看 wallet，看到信託專戶

[A3] /admin/users → 搜尋 alice
     進 detail → 凍結帳戶
     → 回 alice 的 /trader → 嘗試下單 → 403 ACCOUNT_FROZEN
     → admin 解凍 → alice 再下單正常

[A4] /admin/users → bob → 風險等級 low → high，備註

[A5] /admin Dashboard → 看到最近 5~10 筆 audit：
     admin.login, kyc.approve, user.freeze, user.unfreeze, user.risk.change, etc.
```

---

## 後續 Day 7+ 依賴

- Day 7 `/admin/risk` 會讀 `amlStore.listOpen()` + `user.riskLevel` 做告警頁
- Day 7 `/admin/fiat` 會讀 `pendingWithdrawals` + `pendingDeposits` 做人工覆核
- Day 7 `/admin/audit` 會讀 `traderStore.getAuditLog()` 做 WORM 唯讀檢視
- Day 8 Bank 也會讀 `user.kycStatus` 做實名比對
