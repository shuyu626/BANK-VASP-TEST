import { traderStore } from '~~/server/utils/trader-store'
import { amlStore } from '~~/server/utils/aml-store'

// AML 警示詳情
export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id'))
  const alert = amlStore.findById(id)
  if (!alert) throw createError({ statusCode: 404, statusMessage: 'ALERT_NOT_FOUND' })

  const user = traderStore.findUserById(alert.userId)?.user ?? null
  const trustAccount = traderStore.getTrustAccount(alert.userId) ?? null

  return { alert, user, trustAccount }
})
