import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const record = traderStore.findUserById(id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })

  return {
    user: record.user,
    trustAccount: traderStore.getTrustAccount(id) ?? null,
    bankAccounts: traderStore.getBankAccounts(id),
    holdings: traderStore.getHoldings(id),
    recentOrders: traderStore.getUserOrders(id).slice(0, 10),
    kycRecord: traderStore.getKycRecord(id) ?? null
  }
})
