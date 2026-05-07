import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'
import { amlStore } from '~~/server/utils/aml-store'
import { mockMarkets, mockMarketsTwd } from '~~/app/utils/mock/markets'

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export default defineEventHandler((event) => {
  requireAdmin(event)

  const today = isoToday()
  const users = traderStore.listAllUsers()
  const kyc = traderStore.listAllKycRecords()

  // Aggregate trades across all users (deduplicate — traderStore.addTrade pushes to both buyer and seller)
  const allTradeIds = new Set<string>()
  let todayVolume = 0
  for (const u of users) {
    for (const t of traderStore.getUserTrades(u.id)) {
      if (allTradeIds.has(t.id)) continue
      allTradeIds.add(t.id)
      if (t.timestamp.startsWith(today)) {
        // Convert to TWD rough estimate
        const quote = t.symbol.split('/')[1] ?? 'TWD'
        let twdPrice = t.price
        if (quote === 'USDT') {
          const usdtTicker = mockMarketsTwd.find(m => m.base === 'USDT')
          twdPrice = t.price * (usdtTicker?.price ?? 32.4)
        }
        todayVolume += twdPrice * t.quantity
      }
    }
  }

  let fiatInbound = 0
  let fiatOutbound = 0
  for (const u of users) {
    for (const d of traderStore.getFiatDeposits(u.id)) {
      if (d.status === 'completed' && d.completedAt?.startsWith(today)) fiatInbound += d.amount
    }
    for (const w of traderStore.getFiatWithdrawals(u.id)) {
      if (w.status === 'completed' && w.completedAt?.startsWith(today)) fiatOutbound += w.amount
    }
  }

  const newUsersToday = users.filter(u => u.createdAt.startsWith(today)).length
  const pendingKyc = kyc.filter(k => k.status === 'pending').length
  const openAmlAlerts = amlStore.listOpen().length
  const frozen = users.filter(u => u.isFrozen).length

  const recentActivity = [...traderStore.getAuditLog()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20)

  return {
    today: { tradingVolumeTwd: todayVolume, newUsers: newUsersToday, fiatInboundTwd: fiatInbound, fiatOutboundTwd: fiatOutbound },
    counts: { totalUsers: users.length, pendingKyc, openAmlAlerts, frozen },
    recentActivity
  }
})
