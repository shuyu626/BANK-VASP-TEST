# 11 — 金融業資安 Checklist

本文件列出 VASP × 銀行合作場景中，**真實上線版本**需要過的資安檢核項目。
對應 demo 的實作狀態：標 ✅ 表 demo 已實作（即使簡化），❌ 表本 demo 不在範圍。

---

## A. 認證與授權

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| 密碼存儲（不可逆 hash） | ❌ plaintext | Argon2id、salt、cost ≥ 4 |
| 2FA（TOTP / WebAuthn） | ✅ TOTP（mock 接受 `123456`） | 真實 TOTP（RFC 6238）或 WebAuthn |
| Session token 強度 | ✅ 隨機 string | 加密簽章（JWT 短壽 + Refresh Token） |
| Session timeout | ✅ 7 天硬編 | 滑動 timeout + idle timeout 15 分鐘 |
| 角色權限（RBAC） | ✅ trader/admin/bank 分離 | 細粒度：compliance/ops/risk 不同寫入權 |
| Admin 後台分網段 | ❌ | 內網 only + VPN + IP 白名單 |
| API key（給 trader 程式接入） | ✅ permissions: read/trade | 加 IP 限制、流量限制、可撤銷 |
| 2FA 強制開啟（高權限角色） | ❌ 可選 | 強制 admin / compliance 必須啟用 |

`shared/types/index.ts` 的 `AuthSession` schema 已有完整型別。實作 hashing 時建議用 `bcrypt` 或 `argon2` npm package。

---

## B. 資料保護

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| 傳輸層加密 | ❌ | TLS 1.3、HSTS、cert pinning（mobile） |
| 靜態資料加密 | ❌ | 資料庫 column-level encryption（KYC 文件） |
| 敏感欄位脫敏 | ✅ idNumber 顯示末四碼（`****3821`） | 全站一致；log 中也須脫敏 |
| KYC 文件儲存 | ❌（只存 metadata） | S3 + KMS、access logs、TTL |
| PII 最小化原則 | ✅ 顯示時僅必要欄位 | 收集時亦最小化 |
| 個資使用紀錄 | ❌ | 個資存取紀錄（誰、何時、目的） |
| 資料留存政策 | ❌ | 依《洗防法》交易紀錄 5 年；KYC 5 年 |
| GDPR / 個資法刪除權 | ❌ | 客戶要求刪除時的處理流程 |

**特別注意**：
- KYC 上傳的身分證照片、自拍、地址證明 → 屬高敏感個資
- 銀行帳號、虛擬帳號 → 直接金流標的，洩漏會造成損失
- AuditLog 中的 IP、metadata → 可能含 PII，需脫敏

---

## C. 應用層安全（OWASP Top 10）

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| A01 Broken Access Control | ✅ `requireAdmin` / `requireSession` | 完整 RBAC + 資源層級檢查 |
| A02 Cryptographic Failures | ❌ plaintext password | Argon2id、TLS、HSM for KMS |
| A03 Injection | ✅ Zod runtime validation | parameterized query / ORM、CSP |
| A04 Insecure Design | ✅ KYC gate、limit checks | Threat model、abuse case 設計 |
| A05 Security Misconfiguration | ❌ 預設 nuxt config | CSP、CORS、Security Headers |
| A06 Vulnerable Components | ❌ 沒跑 audit | `npm audit` CI、Snyk、Dependabot |
| A07 Auth Failures | ❌ 無 rate limit、可暴力試 | brute-force protection、CAPTCHA |
| A08 Data Integrity Failures | ❌ | SRI、signed packages、deserialization 防護 |
| A09 Logging Failures | ✅ AuditLog 設計 | SIEM 串接、tamper-proof（WORM）、告警 |
| A10 SSRF | ❌ | URL allow-list、internal IP block |

對 Vue 前端的特別注意：
- ✅ 全站用 `{{ }}`（自動 escape），無 `v-html`
- ✅ KYC 圖片用 file metadata 而非直接渲染 user content
- ❌ 無 CSP（建議：`default-src 'self'` + nonce-based script-src）

---

## D. 業務邏輯與合規

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| KYC 強制（入金/交易/提領前） | ✅ approved 才解鎖 | 同 + Tier 限額系統 |
| Tier 限額執行（每日/月） | ✅ 入金 NT$30 萬/日（Tier 1） | 同 + 跨日/月聚合 + bypass alert |
| AML 規則引擎 | ✅ large_amount + 5 種規則 type | 完整：黑名單訂閱、行為模式分析 |
| CTR 自動產生 | ✅ NT$50 萬門檻自動建 draft | 同 + 自動送調查局 e-filing |
| SAR 工作流 | ✅ admin/bank 雙向升級 | 多級審核 + 法務 review |
| 制裁名單比對 | ❌ | OFAC / UN / 歐盟 / 法務部清單訂閱 |
| 凍結帳戶（freeze） | ✅ admin 可執行 | 同 + 緊急凍結（風控自動觸發） |
| 出金人工覆核 | ✅ admin 可拒絕 pending | 同 + 大額/異常單必過人工 |
| 對帳差異追蹤 | ✅ has_diff 標記 | 完整 settlement diff workflow |
| WORM 稽核日誌 | ✅ append-only in-memory | DB level：trigger 防止 update/delete |

---

## E. 基礎設施

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| 部署環境隔離 | ❌ | dev/staging/prod 三環境 + 不同 KMS |
| Secrets 管理 | ❌ | Vault / AWS Secrets Manager |
| CI/CD 安全 | ❌ | 簽章 commit、artifact signing |
| 容器/映像安全 | ❌ | Trivy 掃描、distroless image |
| Backup + DR | ❌ | RPO < 1 hr、RTO < 4 hr、跨 region |
| 監控與告警 | ❌ | APM（Datadog/Sentry）、SLO 告警 |
| 入侵偵測 | ❌ | WAF、SIEM、UEBA |
| Penetration test | ❌ | 上線前必做（外部廠商） |

---

## F. 監管報送

| 項目 | demo | 上線版需要 |
|------|------|-----------|
| CTR 報送格式 | ❌ 只標記 status | 調查局指定 XML / 紙本格式 |
| SAR 報送格式 | ❌ 只標記 status | 同 + 完整證據檔案附件 |
| FATF Travel Rule | ❌ | VASP 間轉帳的 originator/beneficiary 資訊交換 |
| 統計表報送 | ❌ | 月報、季報給金管會 |
| 自律規範遵循 | ❌ | 虛擬通貨商業同業公會自律規範 |

---

## G. 第三方風險

bank × VASP 合作會涉及多個第三方：

- **客戶端銀行**（trader 的入出金來源） — 對方銀行的 KYC 是否可信
- **鏈上分析服務**（Chainalysis / Elliptic） — 出金地址風險評估
- **OFAC / UN 制裁名單訂閱** — 即時更新
- **雲端服務商**（AWS / GCP） — 機房法遵地位、SOC 2 報告

每個第三方都需要：契約 SLA、資安問卷、年度稽核。

---

## 結論

本 demo **聚焦業務流程與三端協作**，**不是**真實生產級的資安實作。

上線時的優先順序建議：
1. **必做**：A 認證授權（密碼 hash + 2FA 強制）、B 資料保護（TLS + KYC 加密）、A05 Security Headers + CSP
2. **強烈建議**：D 業務邏輯（OFAC 比對、Tier 限額）、C03 Injection 防護
3. **上線後加強**：E 基礎設施（監控、入侵偵測、pen test）、F 監管報送格式對接、G 第三方稽核
