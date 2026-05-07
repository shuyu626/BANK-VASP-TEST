import type { AmlAlertType, RiskLevel } from '~~/shared/types'
import { requireAdmin } from '~~/server/utils/require-admin'
import { amlStore } from '~~/server/utils/aml-store'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const q = getQuery(event)
  const statusFilter = typeof q.status === 'string' ? q.status : 'all'
  const severityFilter = typeof q.severity === 'string' ? (q.severity as RiskLevel) : null
  const typeFilter = typeof q.type === 'string' ? (q.type as AmlAlertType) : null

  let alerts = amlStore.list()
  if (statusFilter === 'open') alerts = alerts.filter(a => !a.resolvedAt)
  else if (statusFilter === 'resolved') alerts = alerts.filter(a => !!a.resolvedAt)
  if (severityFilter) alerts = alerts.filter(a => a.severity === severityFilter)
  if (typeFilter) alerts = alerts.filter(a => a.type === typeFilter)

  alerts = [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const users = new Map(traderStore.listAllUsers().map(u => [u.id, u]))
  return {
    items: alerts.map(a => ({ alert: a, user: users.get(a.userId) ?? null }))
  }
})
