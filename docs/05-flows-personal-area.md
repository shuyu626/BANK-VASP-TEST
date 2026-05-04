# 05 — 個人中心流程

Day 5 補完 Trader 的「我自己這區」：委託紀錄 + 設定（安全、API 金鑰、偏好）。

---

## Flow M. 委託紀錄查詢

```
USER               TRADER UI                                SERVER

[/trader/orders]   GET /api/trader/orders
                   ├─ filter by userId (from session)
                   └─ 按 createdAt DESC
                                      │
                   三個 tab：
                   • 全部 (任何 status)
                   • 開倉中 (open / partial)
                   • 歷史 (filled / cancelled / rejected)
                                      │
點開倉中某筆「取消」─▶ DELETE /api/trader/orders/:id
                   → 狀態變 cancelled
                   → AuditLog 'order.cancel'

[/trader/orders/trades]
                   GET /api/trader/orders/trades
                   ├─ traderStore.getUserTrades
                   └─ 按 timestamp DESC
                                      │
                   「匯出 CSV」按鈕
                   → client 組字串（含 BOM）
                   → Blob + <a download>
                   → 檔名 trades_YYYYMMDD_HHmmss.csv
```

---

## Flow N. 修改密碼

```
USER               TRADER UI                                SERVER

[/trader/settings/security]
                   表單：oldPassword + newPassword + confirm
                   client-side：
                   • 新密碼 ≥ 8 字
                   • 含英文 + 數字
                   • 兩次輸入一致
                                      │
送出 ─────────────▶ POST /api/trader/settings/password
                   ├─ Zod 驗證
                   ├─ findUserById → 檢查 oldPassword
                   │  └─ 不符 → 401 WRONG_PASSWORD
                   ├─ updatePassword(userId, newPassword)
                   └─ AuditLog 'auth.password.change'
                                      │
UI 顯示「密碼已更新」
登出後用新密碼登入 → OK
```

⚠️ 本 demo 不做 hash — password 是純文字存 in-memory。真實世界應該：
- Argon2id 或 bcrypt hash
- 修改密碼後 invalidate 其他 sessions
- 通知使用者（email）

---

## Flow O. 2FA 開關

```
USER               TRADER UI                                SERVER

二 fa false → true:
                   看到固定 mock secret "DEMO-SECRET"
                   輸入 TOTP 123456
                                      │
送出 ─────────────▶ POST /api/trader/settings/totp
                   body: { enable: true, code: '123456' }
                   ├─ code !== '123456' → 401 WRONG_TOTP
                   ├─ setTwoFa(userId, true)
                   └─ AuditLog 'auth.totp.enable'
                                      │
session.init() 重新讀取 user 資料
UI 顯示「已啟用雙因子驗證」

二 fa true → false:
                   輸入 TOTP 123456 + 目前密碼
                                      │
送出 ─────────────▶ POST /api/trader/settings/totp
                   body: { enable: false, code: '123456', password }
                   ├─ 檢查 password
                   ├─ setTwoFa(userId, false)
                   └─ AuditLog 'auth.totp.disable'
```

---

## Flow P. API 金鑰：建立與單次秘密揭露

```
USER               TRADER UI                                SERVER

[/trader/settings/api-keys]
                   填表單：label + permissions（read / trade）
                                      │
建立 ─────────────▶ POST /api/trader/settings/api-keys
                   ├─ createApiKey()
                   │  ├─ 產生 id = ak_xxxxxxx
                   │  ├─ 產生 secret = sk_yyyyyyyyy...
                   │  ├─ 存 record（不含 secret）進 Map
                   │  └─ 回傳 {...record, secret}  ← 只此一次
                   └─ AuditLog 'apikey.create'
                                      │
UI 彈出 modal：
  • API Key (公開，之後 list 可見)
  • Secret Key (一次性，關閉後無法再取得)
  • 「複製」按鈕
  • 「我已妥善保存」關閉
                                      │
關閉 modal ────▶   justCreatedKey = null
                   再 GET /api/trader/settings/api-keys
                   → 只看到 id、label、permissions，不含 secret

刪除：
DELETE /api/trader/settings/api-keys/:id
→ AuditLog 'apikey.delete'
```

> ⚠️ 本 demo 的 API key **不可實際使用** — 所有 endpoint 維持只接受 session cookie 認證。
> UI 上有文字說明避免使用者誤試。
> 若未來要真支援，需另寫 middleware 讀 Authorization header + 比對 secret hash。

---

## Flow Q. 市場色彩偏好

```
USER               TRADER UI                                (no server)

[/trader/settings/preferences]
                   切換「紅漲綠跌」↔ 「綠漲紅跌」
                                      │
                   useTraderPrefs.update({ marketColors: 'western' })
                   ├─ 寫入 localStorage.trader:prefs
                   └─ document.documentElement.dataset.marketColors = 'western'
                                      │
                   _tokens.scss 的 [data-market-colors='western'] 覆寫：
                   --color-market-up: #11866f (綠)
                   --color-market-down: #d93838 (紅)
                                      │
                   所有 .text-market-up / .text-market-down / .up / .down 立即套用新色
                   但已渲染的 K 線 candle 顏色是在 createChart 時決定，
                   需重新進入交易頁才會更新
```

---

## Flow R. 登入歷史從稽核日誌

```
USER                 TRADER UI                              SERVER

[/trader/settings/security]
底部「登入紀錄」   GET /api/trader/settings/login-history
                   ├─ traderStore.getLoginHistory(userId, 20)
                   │  └─ auditLog.filter(l => l.actor===userId && l.action==='auth.login')
                   └─ 回傳 AuditLog[]
                                      │
                   UI 顯示：時間、方式（password/totp/register）、IP、session id
```

值得注意：每次 login 都會在 `auth/login.post.ts`（密碼）或 `auth/login/totp.post.ts`（TOTP）或 `auth/register.post.ts` 寫 AuditLog。沒有其他地方產生這個紀錄類型。

---

## Demo 劇本（Day 5）

```
[O1] 登入 alice → /trader/orders
     看到 Day 4 下的單（若同一 server 生命週期內）
     切「開倉中」→ 只看到 limit 2180000 open 單
     點「取消」→ 狀態變 cancelled

[O2] /trader/orders/trades
     看到 market buy 0.005 BTC 的成交
     「匯出 CSV」→ 下載 trades_XXX.csv

[S1] 使用者選單 → 設定 → 自動 redirect 到 /trader/settings/security
     改密碼：old=password new=newpass1 confirm=newpass1 → 成功
     登出 → 用 password 登入 → 401 INVALID_CREDENTIALS
     用 newpass1 登入 → 成功

[S2] 設定 → 安全 → 2FA toggle
     輸入 TOTP 123456 → 啟用成功
     登出 → 登入 → 出現 TOTP 步驟
     TOTP 123456 → 登入成功

[S3] 設定 → API 金鑰
     填 label "my bot"，勾 read
     建立 → modal 顯示 ak_XXX + sk_YYY → 複製 → 關閉
     列表只看到 ak_XXX，無 secret
     刪除 → 確認 → 從列表消失

[S4] 設定 → 偏好
     切「綠漲紅跌」
     回 /trader/markets → 漲跌顏色翻轉（紅變綠、綠變紅）
     切回「紅漲綠跌」

[S5] 登入紀錄
     /trader/settings/security 底部「登入紀錄」
     看到剛才的 password + totp + register 三種登入方式的稽核列
```

---

## 後續 Day 6+ 依賴

- Day 6 Admin Dashboard：會使用 `auditLog` 做 recent activities widget（Day 5 擴充後日誌更有料）
- Day 6 Admin User Management：凍結用戶時會寫 `user.freeze` AuditLog
- Day 7 Admin Risk：顯示 `traderStore.getAllOrders()` 的大單 + 風險等級
