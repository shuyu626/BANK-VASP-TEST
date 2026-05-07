import { traderStore } from '~~/server/utils/trader-store'

// 對帳清單：以「日」為單位 batch，由 deposit/withdrawal 動態聚合
// 含「VASP 端記錄」 vs 「銀行端記錄」對比與差異
export default defineEventHandler(() => {
  const users = traderStore.listAllUsers()

  // 收集所有 fiat tx，按日分組
  const byDate = new Map<string, {
    depositCount: number
    depositAmount: number
    withdrawCount: number
    withdrawAmount: number
    pendingCount: number
    failedCount: number
  }>()

  function bucket(date: string) {
    let b = byDate.get(date)
    if (!b) {
      b = { depositCount: 0, depositAmount: 0, withdrawCount: 0, withdrawAmount: 0, pendingCount: 0, failedCount: 0 }
      byDate.set(date, b)
    }
    return b
  }

  for (const u of users) {
    for (const d of traderStore.getFiatDeposits(u.id)) {
      const date = d.submittedAt.slice(0, 10)
      const b = bucket(date)
      b.depositCount++
      if (d.status === 'completed') b.depositAmount += d.amount
      if (d.status === 'pending' || d.status === 'reviewing') b.pendingCount++
      if (d.status === 'rejected' || d.status === 'failed') b.failedCount++
    }
    for (const w of traderStore.getFiatWithdrawals(u.id)) {
      const date = w.submittedAt.slice(0, 10)
      const b = bucket(date)
      b.withdrawCount++
      if (w.status === 'completed') b.withdrawAmount += w.amount
      if (w.status === 'pending' || w.status === 'reviewing' || w.status === 'approved') b.pendingCount++
      if (w.status === 'rejected' || w.status === 'failed') b.failedCount++
    }
  }

  const items = Array.from(byDate.entries())
    .map(([date, agg]) => ({
      date,
      ...agg,
      netFlow: agg.depositAmount - agg.withdrawAmount,
      // demo：銀行端與 VASP 對帳差異模擬，pendingCount 視為「需追蹤」
      hasDiff: agg.pendingCount > 0 || agg.failedCount > 0
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return { items }
})
