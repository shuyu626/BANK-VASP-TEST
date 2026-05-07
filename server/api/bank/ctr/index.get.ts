import { traderStore } from '~~/server/utils/trader-store'
import { reportStore } from '~~/server/utils/report-store'

// CTR 大額報表清單（銀行視角）：可標記為已送
export default defineEventHandler(() => {
  const reports = reportStore.listCtr()
  const items = reports.map(r => {
    const user = traderStore.findUserById(r.userId)?.user
    return { report: r, user: user ? { id: user.id, displayName: user.displayName } : null }
  })
  return { items }
})
