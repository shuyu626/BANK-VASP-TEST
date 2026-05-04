# 04 — 現貨交易動線

Day 4 把交易頁的結構與下單流程做完。Day 5 才處理「我過去下過什麼訂單」的紀錄頁。

---

## Flow H. 市場瀏覽 → 進入交易

```
USER                TRADER UI                               SERVER

[/trader/markets]   載入全部 tickers（TWD + USDT）
                    ├─ 頁籤切換（全部/TWD/USDT/收藏）
                    ├─ 搜尋（symbol/base/name）
                    ├─ 排序（price/24h%/volume）
                    └─ 收藏 → localStorage `trader:favorites`
                                      │
點擊 row ────────▶  router.push('/trader/trade/' + symbolToSlug(symbol))
                    「BTC/TWD」→ 「BTC-TWD」
```

---

## Flow I. 現貨下單：限價

```
USER                TRADER UI                               SERVER

[/trader/trade/BTC-TWD]
  ├─ GET /api/trader/markets/BTC-TWD/klines?interval=15m
  ├─ GET /api/trader/markets/BTC-TWD/orderbook
  ├─ GET /api/trader/markets/BTC-TWD/trades
  └─ GET /api/trader/wallet/snapshot
                                      │
                    OrderForm：
                    side=buy, type=limit
                    price=2180000, qty=0.01
                                      │
送出 ─────────────▶ POST /api/trader/orders
                    │ ├─ Zod 驗證
                    │ ├─ matching-engine.placeOrder()
                    │ │  ├─ KYC approved?
                    │ │  ├─ quote==TWD → 可用餘額 − notional×(1.001) ≥ 0?
                    │ │  └─ 建立 Order(status=open)
                    │ └─ 回傳 order
                    │
訂單簿即時刷新 ◀─────┘
            orderbook.bids 加入「使用者自己的 price level」
            (客製欄位：UI 可標示「自己」— Day 5 再加)
```

限價單不自動撮合（單人模擬），保持 open 到 user cancel 或手動 fill。

---

## Flow J. 現貨下單：市價

```
USER                TRADER UI                               SERVER

OrderForm：
side=buy, type=market
qty=0.005 BTC
                                      │
送出 ─────────────▶ POST /api/trader/orders
                    │ ├─ matching-engine.placeOrder()
                    │ │  ├─ effectivePrice = mark × (1 + 0.0002)  ← 滑價 0.02%
                    │ │  ├─ notional = price × qty
                    │ │  ├─ fee = notional × 0.001
                    │ │  ├─ 檢查 fiatAvailable ≥ notional + fee
                    │ │  ├─ adjustFiatBalance(-(notional+fee))
                    │ │  ├─ adjustHolding(BTC, +qty)
                    │ │  ├─ 建立 Order(status=filled, avgFillPrice)
                    │ │  └─ 建立 Trade 記錄
                    │ └─ 回傳 order
                    │
wallet.refresh() ◀──┘
toast 「已立即成交」
```

---

## Flow K. 訂單簿點擊帶入

```
USER                  TRADER UI

[訂單簿某一格價格]  點擊 ask 2188000
                   → OrderBook emit('pick', { price: 2188000, side: 'buy' })
                   → 父頁面接手 → orderForm.fillPrice(2188000, 'buy')
                   → 表單自動切 limit、填入 price、side
```

UX 原則：點賣盤（ask）→ 下買單（吃對手賣單）；點買盤（bid）→ 下賣單。

---

## Flow L. 買賣顏色的台灣慣例

| 位置 | 色 | token |
|------|-----|-------|
| K 線 up candle | 紅 | 直接 `#d93838`（給 lightweight-charts 用） |
| K 線 down candle | 綠 | `#11866f` |
| 訂單簿 ask（賣盤） | 紅 | `text-market-up` / `bg-market-up/10` |
| 訂單簿 bid（買盤） | 綠 | `text-market-down` / `bg-market-down/10` |
| 下單「買入」按鈕 | 綠（期待上漲） | `bg-market-down` |
| 下單「賣出」按鈕 | 紅（期待下跌） | `bg-market-up` |
| 24h 漲跌百分比 | 正紅／負綠 | `.up` / `.down` |

---

## Demo 劇本（Day 4）

前置：alice 已登入，Tier 2，信託餘額 NT$ 914,485（如果延續 Day 3 的測試）。

```
[M1] /trader/markets
     看到 12 個交易對（4 TWD + 8 USDT）
     按「24h 量」排序 DESC → BTC/TWD 與 BTC/USDT 在前幾位
     切「TWD」分頁 → 只剩 4 個
     搜尋「btc」→ BTC/TWD、BTC/USDT
     按 BTC/TWD 的 ☆ → ★（收藏）
     切「收藏」分頁 → 只剩 BTC/TWD

[M2] 點 BTC/TWD → /trader/trade/BTC-TWD
     看到四個區塊：chart (15m)、訂單簿（bid綠/ask紅）、近期成交、下單表單
     切「1h」K 線 → 重新載入 60 條

[T1] 下單表單：
     側：買入（綠）
     類型：限價
     價格：2180000（低於 mark）
     數量：0.001
     按 25% → quantity 自動算出
     改回 0.001
     按「買入 BTC」→ 訂單簿 bid 2180000 加深（自己的單）

[T2] 切市價：
     側：買入
     數量：0.005
     按「買入 BTC」→ 立即 filled，toast「已立即成交」
     wallet 刷新：BTC 持倉 +0.005，TWD 扣除

[T3] 點訂單簿某個 ask price → 表單自動切買入並帶入 price
     修改 qty → 提交 → 看到另一筆 limit 進簿

[T4] 切到賣出：
     數量：0.001
     按「賣出 BTC」→ 訂單簿 ask 加上自己的 sell order

[T5] 切 ETH/TWD（用下拉選單）→ 頁面重載新 symbol
```

---

## 後續 Day 5 連接

Day 5 的 `/trader/orders` 會從 `traderStore.getUserOrders(userId)` 拉資料並做篩選。
Day 4 已經產生足夠的 Order 紀錄（limit open + market filled）供 Day 5 直接 render。
