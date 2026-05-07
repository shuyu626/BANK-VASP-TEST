import { requireAdmin } from '~~/server/utils/require-admin'
import { amlStore } from '~~/server/utils/aml-store'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const alert = amlStore.findById(id)
  if (!alert) throw createError({ statusCode: 404, statusMessage: 'ALERT_NOT_FOUND' })
  const user = traderStore.findUserById(alert.userId)?.user ?? null
  return { alert, user }
})
