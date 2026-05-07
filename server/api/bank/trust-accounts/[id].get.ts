import { traderStore } from '~~/server/utils/trader-store'

// 信託專戶詳情：account + user + 最近金流（deposit + withdrawal 合併）
export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id'))

  // ta_id 直接查詢；找出 userId
  const users = traderStore.listAllUsers()
  let target = null as { user: ReturnType<typeof traderStore.listAllUsers>[number]; ta: ReturnType<typeof traderStore.getTrustAccount> } | null
  for (const u of users) {
    const ta = traderStore.getTrustAccount(u.id)
    if (ta?.id === id) { target = { user: u, ta }; break }
  }

  if (!target?.ta) {
    throw createError({ statusCode: 404, statusMessage: 'TRUST_ACCOUNT_NOT_FOUND' })
  }

  const userId = target.user.id
  const deposits = traderStore.getFiatDeposits(userId).slice(0, 50)
  const withdrawals = traderStore.getFiatWithdrawals(userId).slice(0, 50)

  type Movement = { kind: 'in' | 'out'; id: string; at: string; amount: number; status: string; ref: string | null }
  const movements: Movement[] = [
    ...deposits.map(d => ({
      kind: 'in' as const, id: d.id, at: d.submittedAt, amount: d.amount, status: d.status, ref: d.bankReference
    })),
    ...withdrawals.map(w => ({
      kind: 'out' as const, id: w.id, at: w.submittedAt, amount: w.amount, status: w.status, ref: null
    }))
  ].sort((a, b) => b.at.localeCompare(a.at))

  return {
    account: target.ta,
    user: target.user,
    movements: movements.slice(0, 30)
  }
})
