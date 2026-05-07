import { traderStore } from '~~/server/utils/trader-store'
import { amlStore } from '~~/server/utils/aml-store'

// AML 警示清單（銀行視角）：可篩選 open / resolved
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const filter = String(query.status ?? 'open')
  const severity = query.severity ? String(query.severity) : undefined

  let alerts = amlStore.list()
  if (filter === 'open') alerts = alerts.filter(a => !a.resolvedAt)
  else if (filter === 'resolved') alerts = alerts.filter(a => !!a.resolvedAt)
  if (severity) alerts = alerts.filter(a => a.severity === severity)

  alerts = [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const items = alerts.map(a => {
    const u = traderStore.findUserById(a.userId)?.user
    return { alert: a, user: u ? { id: u.id, displayName: u.displayName, riskLevel: u.riskLevel, isFrozen: u.isFrozen } : null }
  })

  return { items }
})
