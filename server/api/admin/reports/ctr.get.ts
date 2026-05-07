import { requireAdmin } from '~~/server/utils/require-admin'
import { reportStore } from '~~/server/utils/report-store'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const list = reportStore.listCtr()
  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  return {
    items: list.map(r => ({
      report: r,
      user: users.get(r.userId) ? { id: r.userId, displayName: users.get(r.userId)!.displayName } : null
    }))
  }
})
