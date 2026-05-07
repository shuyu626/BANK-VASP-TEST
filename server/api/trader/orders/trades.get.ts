import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const trades = traderStore.getUserTrades(session.user.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return { trades }
})
