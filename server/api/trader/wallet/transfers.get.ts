import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const userId = session.user.id
  const deposits = traderStore.getFiatDeposits(userId).map(d => ({ kind: 'deposit' as const, ...d }))
  const withdrawals = traderStore.getFiatWithdrawals(userId).map(w => ({ kind: 'withdrawal' as const, ...w }))
  const merged = [...deposits, ...withdrawals].sort(
    (a, b) => b.submittedAt.localeCompare(a.submittedAt)
  )
  return { items: merged }
})
