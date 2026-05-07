import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const record = traderStore.listAllKycRecords().find(r => r.id === id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'KYC_NOT_FOUND' })
  const user = traderStore.findUserById(record.userId)?.user
  return { record, user }
})
