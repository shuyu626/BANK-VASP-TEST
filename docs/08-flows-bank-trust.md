# 08 — 銀行端：信託、KYC 比對、對帳

Day 8 把 bank layout sidebar 的前四個連結補完：Dashboard、信託專戶、KYC 比對、對帳中心。

bank 端的角色是 **TaiEx 交易所的合作銀行（東東商銀）**。它不撮合、不交易，職責是：

1. 受託保管 VASP 客戶的新台幣資金（信託專戶）
2. 對 VASP 送來的 KYC 資料做實名制比對與信託子帳號開立
3. 每日對帳：核對 VASP 端紀錄與銀行端實際進出
4. 主管機關規定的 AML / CTR / SAR 報送（Day 9）

bank 端在本 demo 中**無 session 驗證**，是 public read-mostly view。實務上會以 OAuth client credential 或 IP allow-list 對接 VASP。

---

## Flow A. 信託專戶（Trust Accounts）

```
        VASP（TaiEx）              BANK（東東）
                                  ┌──────────────────────────┐
   客戶完成 KYC                    │  信託專戶（Trust Account）│
        │                          │  ─────────────────────────│
        ▼                          │  vaspId: vasp_demo        │
   admin/kyc approve              │  userId: u_001            │
        │                          │  虛擬帳號 8056-2001-...   │
        ▼                          │  balance: NT$ 284,500     │
   POST /api/admin/kyc/[id]/      │  createdAt: ...           │
        approve                    └──────────────────────────┘
        │
        ▼
   traderStore.createTrustAccount(vaspId, virtualAccountNumber)
        │
        ▼
   GET /api/bank/trust-accounts
   ←────── 銀行端可看到所有客戶的信託子帳號
```

**重點**：
- VASP（TaiEx）不可動用客戶的信託資金，只能透過代付指令請求銀行匯出
- 每位客戶分配獨立虛擬帳號，銀行對帳時可直接識別資金歸屬
- bank 端 `GET /api/bank/trust-accounts` 回傳每個帳號 + 當月進出金額（從既有 `traderStore.getFiatDeposits / getFiatWithdrawals` 動態計算）

---

## Flow B. KYC 比對

VASP 端 admin 通過 KYC 後，**還沒有完成銀行的實名制核對**。`KycRecord.bankVerifiedAt` 為 `null`，銀行端會在 `/bank/kyc-match` 看到「待比對」清單。

```
ADMIN（VASP）                            BANK（東東）

/admin/kyc/[id] approve              /bank/kyc-match (status=pending)
        │                                 │
        ▼                                 ▼
KycRecord.status = 'approved'       清單顯示 record.status='approved'
record.bankVerifiedAt = null        且 record.bankVerifiedAt IS NULL
                                          │
                                          ▼
                                    /bank/kyc-match/[id]
                                    顯示：身分資料、綁定銀行、信託帳號
                                          │
                                    （銀行員人工核對：身分證資料是否與
                                     聯徵資料庫吻合、戶頭名實一致）
                                          │
                                          ▼
                                    POST /api/bank/kyc-match/[id]/verify
                                    body: { note? }
                                          │
                                          ▼
                                    record.bankVerifiedAt = now
                                    AuditLog 'kyc.bank.verify'
                                    actorRole = 'bank'
```

**注意**：本 demo 為簡化，KYC 通過審核後不會自動建信託帳號。`mockTrustAccounts` 直接 seed 給 u_001 / u_003，模擬「歷史已合作客戶」。實際情境裡這兩個動作應該綁定。

---

## Flow C. 對帳中心

對帳是「每日 batch」：把當日所有 fiat tx 按日期分組，比對：
- VASP 端紀錄（traderStore 內的 deposits + withdrawals）
- 銀行端紀錄（demo 中與 VASP 端為同一份資料；實務上是兩個獨立資料源）
- 標記「需追蹤」：含 pending / failed 紀錄的日期

```
GET /api/bank/reconciliation
    └─ 聚合：byDate.{depositCount, depositAmount, ...}
       sort by date desc

GET /api/bank/reconciliation/[date]
    └─ 詳細列出該日所有 fiat tx
    └─ summary：depositAmount, withdrawAmount, pendingRows, failedRows
```

每日 hasDiff 邏輯：
```ts
hasDiff = pendingCount > 0 || failedCount > 0
```

實務上會更複雜：銀行端 statement vs VASP 端 ledger 的差異會逐筆比對，差異需要 settlement team 跟進。本 demo 把「需追蹤」極簡化為：「只要當日還有處理中或失敗的 tx，就視為對帳尚未完全平倉」。

---

## API 一覽

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/bank/dashboard` | 總覽 KPI |
| GET | `/api/bank/trust-accounts` | 信託專戶清單 |
| GET | `/api/bank/trust-accounts/[id]` | 帳號詳情 + 最近 30 筆金流 |
| GET | `/api/bank/kyc-match?status=pending\|matched\|all` | KYC 比對清單 |
| GET | `/api/bank/kyc-match/[id]` | KYC 詳情（含綁定銀行帳號） |
| POST | `/api/bank/kyc-match/[id]/verify` | 標記比對通過 |
| GET | `/api/bank/reconciliation` | 每日對帳清單 |
| GET | `/api/bank/reconciliation/[date]` | 某日對帳明細 |

---

## 寫入點

bank 端只有一個寫入動作：`POST /api/bank/kyc-match/[id]/verify`，會：

1. 修改 `KycRecord.bankVerifiedAt = now`（mutation 透過 `traderStore.getKycRecord` 拿 reference 後直接寫）
2. `traderStore.appendAudit(...)` 寫一筆 actorRole='bank' 的稽核日誌

所有寫入都會 mirror 到 audit log。bank 端的所有讀取則純粹聚合既有 store。
