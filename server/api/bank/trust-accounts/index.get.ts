import { traderStore } from '~~/server/utils/trader-store'

// 信託專戶清單：每位 trader 對應的虛擬帳號 + 餘額 + 當月活躍度
export default defineEventHandler(() => {
  const monthPrefix = new Date().toISOString().slice(0, 7)
  const users = traderStore.listAllUsers()

  const items = users
    .map(u => {
      const ta = traderStore.getTrustAccount(u.id)
      if (!ta) return null

      const deposits = traderStore.getFiatDeposits(u.id)
      const withdrawals = traderStore.getFiatWithdrawals(u.id)

      const monthInflow = deposits
        .filter(d => d.status === 'completed' && d.submittedAt.startsWith(monthPrefix))
        .reduce((s, d) => s + d.amount, 0)
      const monthOutflow = withdrawals
        .filter(w => w.status === 'completed' && w.submittedAt.startsWith(monthPrefix))
        .reduce((s, w) => s + w.amount, 0)

      return {
        account: ta,
        user: { id: u.id, displayName: u.displayName, email: u.email, kycTier: u.kycTier, riskLevel: u.riskLevel, isFrozen: u.isFrozen },
        monthInflow,
        monthOutflow
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.account.balance - a.account.balance)

  return { items }
})
