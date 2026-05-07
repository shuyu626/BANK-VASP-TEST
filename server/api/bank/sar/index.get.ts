import { traderStore } from '~~/server/utils/trader-store'
import { reportStore } from '~~/server/utils/report-store'

// SAR 可疑報表清單（銀行視角）
export default defineEventHandler(() => {
  const reports = reportStore.listSar()
  const items = reports.map(r => {
    const user = traderStore.findUserById(r.userId)?.user
    return { report: r, user: user ? { id: user.id, displayName: user.displayName } : null }
  })
  return { items }
})
