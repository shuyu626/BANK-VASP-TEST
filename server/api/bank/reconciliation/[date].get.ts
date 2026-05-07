import { traderStore } from '~~/server/utils/trader-store'

// 某日對帳明細：列出當日所有 fiat tx，標記狀態
export default defineEventHandler((event) => {
  const date = String(getRouterParam(event, 'date'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_DATE_FORMAT' })
  }

  const users = traderStore.listAllUsers()
  type Row = {
    kind: 'deposit' | 'withdrawal'
    id: string
    userId: string
    userName: string
    amount: number
    status: string
    submittedAt: string
    completedAt: string | null
    bankReference: string | null
  }

  const rows: Row[] = []
  for (const u of users) {
    for (const d of traderStore.getFiatDeposits(u.id)) {
      if (!d.submittedAt.startsWith(date)) continue
      rows.push({
        kind: 'deposit',
        id: d.id,
        userId: u.id,
        userName: u.displayName,
        amount: d.amount,
        status: d.status,
        submittedAt: d.submittedAt,
        completedAt: d.completedAt,
        bankReference: d.bankReference
      })
    }
    for (const w of traderStore.getFiatWithdrawals(u.id)) {
      if (!w.submittedAt.startsWith(date)) continue
      rows.push({
        kind: 'withdrawal',
        id: w.id,
        userId: u.id,
        userName: u.displayName,
        amount: w.amount,
        status: w.status,
        submittedAt: w.submittedAt,
        completedAt: w.completedAt,
        bankReference: null
      })
    }
  }

  rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  // Aggregates
  const completedDeposits = rows.filter(r => r.kind === 'deposit' && r.status === 'completed')
  const completedWithdrawals = rows.filter(r => r.kind === 'withdrawal' && r.status === 'completed')
  const summary = {
    date,
    totalRows: rows.length,
    depositCount: rows.filter(r => r.kind === 'deposit').length,
    depositAmount: completedDeposits.reduce((s, r) => s + r.amount, 0),
    withdrawCount: rows.filter(r => r.kind === 'withdrawal').length,
    withdrawAmount: completedWithdrawals.reduce((s, r) => s + r.amount, 0),
    pendingRows: rows.filter(r => ['pending', 'reviewing', 'approved'].includes(r.status)).length,
    failedRows: rows.filter(r => ['rejected', 'failed'].includes(r.status)).length
  }

  return { summary, rows }
})
