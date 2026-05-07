import { getBankDashboardSummary } from '~~/server/utils/bank-aggregations'

// 銀行端 dashboard：聚合視角（信託總額、當日金流、合規待辦）
// 不做 session 檢查 — bank 端為 demo public view
// 業務邏輯放 server/utils/bank-aggregations.ts，handler 只做傳遞
export default defineEventHandler(() => {
  return getBankDashboardSummary()
})
