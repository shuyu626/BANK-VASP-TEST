# 09 — 銀行端：AML、CTR、SAR、監管報送

Day 9 把 bank layout 剩下四個連結補完。bank 端的合規報送與 admin 端的合規不同：

| 角色 | 視角 | 動作 |
|------|------|------|
| Admin（compliance / risk） | 交易所內部風控 | 凍結用戶、誤判結案、升級 SAR |
| Bank（compliance） | 對外通報主管機關 | 升級 SAR、CTR/SAR 標記送出 |

兩端共用同一份 `amlStore` 與 `reportStore`（mock 資料），但寫入動作的 actorRole 不同。

---

## Flow D. AML 警示（銀行視角）

銀行端能看到所有 AML 警示（同 admin），但**升級 SAR** 的動作由銀行 compliance 部門執行，因為 SAR 是**對監管機關（調查局洗錢防制處）的正式通報文件**，由銀行端送出更符合實務。

```
BANK（compliance）                         SERVER

/bank/aml (status=open)
    │
    ├─ severity filter: low/medium/high/critical
    │
    ▼
/bank/aml/[id]
    │
    ▼
顯示：alert + user + trustAccount
    │
    ▼
[填寫 narrative ≥ 20 字]
    │
    ▼
POST /api/bank/aml/[id]/escalate
body: { narrative: string }
    │
    ├─ reportStore.createSarDraft(...)
    │     status='draft', createdBy='bank_compliance'
    │
    ├─ amlStore.resolveAlert(id, 'escalated_to_sar', 'bank_compliance')
    │
    └─ AuditLog 'aml.alert.escalate' actorRole='bank'
       metadata: { sarId }
       │
       ▼
       Toast → 跳轉 /bank/sar
```

bank 端**沒有「凍結帳戶」動作**——凍結是交易所端責任（透過 `/admin/users/[id]/freeze`），bank 端只負責通報。

---

## Flow E. CTR 大額交易報告

CTR draft 由 settlement engine **自動產生**：

```
TRADER 入金完成（amount ≥ NT$ 500,000）
    │
    ▼
settlement engine: amlStore.appendAlert(large_amount)
    │
    ▼
reportStore.createCtrDraft({ userId, amount, txId, dateIso })
    └─ 同 (userId, date) 已有 draft 則累加，否則新建
```

bank 端的 `/bank/ctr` 列出所有 CTR，**僅標記送出**：

```
[bank/ctr]
    │
    ├─ status='draft' → 按「送出」
    │     POST /api/bank/ctr/[id]/mark
    │     body: { status: 'submitted' }
    │     → reportStore.markCtrSubmitted(id)
    │     → AuditLog 'ctr.submitted'
    │
    └─ status='submitted' → 按「標記接收」
          body: { status: 'accepted' }
          → reportStore.markCtrAccepted(id)
          → AuditLog 'ctr.accepted'
```

**台灣 CTR 門檻**：單筆或當日累計達 NT$50 萬以上的虛擬資產交易需報送調查局。
（依《虛擬通貨平台及交易業務事業防制洗錢及打擊資恐辦法》）

定義在 `shared/types/transfer-fees.ts`：
```ts
export const CTR_THRESHOLD_TWD = 500_000
```

---

## Flow F. SAR 可疑交易報告

SAR 由銀行 compliance 從 AML 警示**人工升級**而來（Flow D），無自動化路徑。送出流程同 CTR：

```
[bank/sar]
    │
    ├─ status='draft' or 'under_review' → 按「送出」
    │     POST /api/bank/sar/[id]/mark
    │     body: { status: 'submitted' }
    │     → reportStore.markSarSubmitted(id)
    │     → AuditLog 'sar.submitted'
    │
    └─ status='submitted' → 按「標記接收」
          body: { status: 'accepted' }
          → reportStore.markSarAccepted(id)
          → AuditLog 'sar.accepted'
```

**注意**：SAR 包含**敘述**（narrative）—— 由建立者填寫的可疑情節描述，調查局接收後可作為偵查依據。本 demo 強制最少 20 字，實務上應該至少數百字、含具體時間/金額/對手方/合理懷疑依據。

---

## Flow G. 監管報送總覽

`/bank/regulator-reports` 是 CTR + SAR 的概覽 dashboard：

```
GET /api/bank/regulator-reports
    │
    ▼
{
  ctrStats: { draft, submitted, accepted },
  sarStats: { draft, underReview, submitted, accepted },
  openAmlAlerts: number,           // 還在路上、可能變成 SAR
  recent: RecentItem[]             // 近 20 筆送辦紀錄（按 submittedAt desc）
}
```

關鍵指標：
- `ctrStats.draft` 大於 0 → 有 CTR 應送未送
- `sarStats.draft` 大於 0 → 有 SAR 應送未送
- `openAmlAlerts` 大於 0 → 有未處理警示，可能後續變成 SAR

---

## API 一覽

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/bank/aml?status=open\|resolved\|all&severity=...` | AML 警示清單 |
| GET | `/api/bank/aml/[id]` | 警示詳情 |
| POST | `/api/bank/aml/[id]/escalate` | 升級為 SAR（建 draft + resolve alert） |
| GET | `/api/bank/ctr` | CTR 報表清單 |
| POST | `/api/bank/ctr/[id]/mark` | 標記送出 / 接收 |
| GET | `/api/bank/sar` | SAR 報表清單 |
| POST | `/api/bank/sar/[id]/mark` | 標記送出 / 接收 |
| GET | `/api/bank/regulator-reports` | 概覽（CTR+SAR 分類統計 + 近期送辦） |

---

## 法規對應

| 動作 | 法源 | 說明 |
|------|------|------|
| CTR 自動產生 | 《虛擬通貨平台及交易業務事業防制洗錢及打擊資恐辦法》 | NT$50 萬門檻 |
| SAR 升級 | 同上 | 銀行端覆核後，由 compliance 送出 |
| AuditLog 寫入 | 《洗防法》第 7 條 | 紀錄保存五年 |
| KYC 比對 | 《銀行對虛擬通貨平台之業者及交易業務事業之契約應約定事項》 | 銀行端實名制核對 |

詳細法規背景見 `01-regulation.md`。
