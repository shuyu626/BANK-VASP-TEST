import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const id = String(getRouterParam(event, 'id'))

  const list = traderStore.getBankAccounts(session.user.id)
  const target = list.find(b => b.id === id)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'BANK_ACCOUNT_NOT_FOUND' })
  }
  // 已驗證的帳戶不能刪（demo 規則：要走後台撤銷流程）
  if (target.isVerified) {
    throw createError({ statusCode: 400, statusMessage: 'CANNOT_REMOVE_VERIFIED' })
  }

  traderStore.removeBankAccount(session.user.id, id)
  traderStore.appendAudit({
    actor: session.user.id,
    actorRole: 'user',
    action: 'wallet.bank_account.remove',
    resourceType: 'bank_account',
    resourceId: id,
    metadata: { bankCode: target.bankCode },
    ipAddress: getRequestIP(event) ?? null
  })

  return { ok: true }
})
