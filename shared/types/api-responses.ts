// 集中 API endpoint 的 response 型別。
// 規則：
// - 若 endpoint 直接回傳 entity（單一或陣列），請複用 shared/types 內的 entity type，不要在這裡再寫一次
// - 若 endpoint 回傳「entity 子集」、「多個 entity 組合」、「聚合數據」，才放這裡
// - 不要在頁面內 inline 定義 response interface，請集中於此並由 import 取得

import type { CryptoWithdrawal } from './index'

// ── Trader / Wallet ─────────────────────────────────────────────

export interface FiatWithdrawalLimitsResponse {
  dailyLimit: number
  dailyUsed: number
  dailyRemaining: number
  monthlyLimit: number
  monthlyUsed: number
  monthlyRemaining: number
}

/** trader 自己看的加密提幣列表（不帶 userId） */
export interface CryptoWithdrawalListResponse {
  withdrawals: Omit<CryptoWithdrawal, 'userId'>[]
}

// ── Bank / Dashboard ────────────────────────────────────────────
// （bank dashboard 用 server/utils/bank-aggregations.ts 的 BankDashboardSummary
//  不在前端共用，故不放這裡）
