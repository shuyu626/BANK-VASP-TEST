import { traderStore } from '~~/server/utils/trader-store'

// KYC 比對清單：bank 端視角
// status filter：pending（待比對）/ matched（已比對）/ all
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const filter = String(query.status ?? 'pending')

  const records = traderStore.listAllKycRecords()
  // 只看交易所已通過的（rejected 狀態的不會送到銀行端比對）
  const candidates = records.filter(r => r.status === 'approved' || r.status === 'pending')

  const filtered = candidates.filter(r => {
    if (filter === 'matched') return r.bankVerifiedAt !== null
    if (filter === 'pending') return r.bankVerifiedAt === null && r.status === 'approved'
    return true
  })

  const items = filtered
    .map(r => {
      const user = traderStore.findUserById(r.userId)?.user
      const bankAccounts = traderStore.getBankAccounts(r.userId)
      return { record: r, user, bankAccounts }
    })
    .sort((a, b) => b.record.submittedAt.localeCompare(a.record.submittedAt))

  return { items }
})
