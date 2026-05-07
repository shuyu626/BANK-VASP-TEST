import { traderStore } from '~~/server/utils/trader-store'

// KYC 比對詳情：record + user + 綁定銀行帳號
export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id'))
  const record = traderStore.listAllKycRecords().find(r => r.id === id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'KYC_NOT_FOUND' })

  const user = traderStore.findUserById(record.userId)?.user
  const bankAccounts = traderStore.getBankAccounts(record.userId)
  const trustAccount = traderStore.getTrustAccount(record.userId)

  return { record, user, bankAccounts, trustAccount }
})
