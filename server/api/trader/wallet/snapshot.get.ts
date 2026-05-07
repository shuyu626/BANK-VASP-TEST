import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const userId = session.user.id
  return {
    trustAccount:            traderStore.getTrustAccount(userId) ?? null,
    bankAccounts:            traderStore.getBankAccounts(userId),
    holdings:                traderStore.getHoldings(userId),
    pendingDeposits:         traderStore.getFiatDeposits(userId).filter(d => d.status === 'pending'),
    pendingWithdrawals:      traderStore.getFiatWithdrawals(userId).filter(w => w.status === 'pending' || w.status === 'approved'),
    pendingCryptoWithdrawals: traderStore.getCryptoWithdrawals(userId).filter(c => c.status === 'pending'),
    addressBook:             traderStore.getAddressBook(userId)
  }
})
