import type { CryptoWithdrawal } from '~~/shared/types'
import { CryptoWithdrawInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { scheduleCryptoWithdraw } from '~~/server/utils/settlement-engine'
import { TRANSFER_FEES, SETTLEMENT_DELAYS } from '~~/shared/types/transfer-fees'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  if (session.user.isFrozen) {
    throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_FROZEN' })
  }
  if (session.user.kycStatus !== 'approved') {
    throw createError({ statusCode: 403, statusMessage: 'KYC_NOT_APPROVED' })
  }

  const body = await readBody(event)
  const parsed = CryptoWithdrawInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  const userId = session.user.id
  const feeCfg = TRANSFER_FEES.cryptoWithdraw[parsed.data.asset]
  if (!feeCfg) {
    throw createError({ statusCode: 400, statusMessage: 'UNSUPPORTED_ASSET' })
  }
  if (feeCfg.network !== parsed.data.network) {
    throw createError({ statusCode: 400, statusMessage: 'NETWORK_MISMATCH' })
  }
  if (parsed.data.amount < feeCfg.minAmount) {
    throw createError({ statusCode: 422, statusMessage: 'BELOW_MIN_AMOUNT', data: { min: feeCfg.minAmount } })
  }

  // Address book cooldown
  const entry = traderStore.findAddressBookEntry(userId, parsed.data.addressBookEntryId)
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'ADDRESS_NOT_FOUND' })
  }
  const ageMs = Date.now() - new Date(entry.addedAt).getTime()
  if (ageMs < SETTLEMENT_DELAYS.newAddressCooldownMs) {
    throw createError({
      statusCode: 422,
      statusMessage: 'ADDRESS_COOLDOWN',
      data: { remainingMs: SETTLEMENT_DELAYS.newAddressCooldownMs - ageMs }
    })
  }
  if (entry.asset !== parsed.data.asset || entry.network !== parsed.data.network) {
    throw createError({ statusCode: 400, statusMessage: 'ADDRESS_ASSET_MISMATCH' })
  }

  // Sufficient holding
  const holding = traderStore.getHolding(userId, parsed.data.asset)
  const available = holding?.amount ?? 0
  const total = parsed.data.amount + feeCfg.fee
  if (available < total) {
    throw createError({
      statusCode: 422,
      statusMessage: 'INSUFFICIENT_HOLDING',
      data: { available }
    })
  }

  const withdrawal: CryptoWithdrawal = {
    id: `cw_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    asset: parsed.data.asset,
    network: parsed.data.network,
    toAddress: entry.address,
    amount: parsed.data.amount,
    fee: feeCfg.fee,
    status: 'pending',
    txHash: null,
    submittedAt: new Date().toISOString(),
    completedAt: null
  }
  traderStore.addCryptoWithdrawal(withdrawal)
  traderStore.appendAudit({
    actor: userId, actorRole: 'user',
    action: 'crypto.withdraw.request',
    resourceType: 'crypto_withdrawal', resourceId: withdrawal.id,
    metadata: { asset: withdrawal.asset, amount: withdrawal.amount, fee: withdrawal.fee },
    ipAddress: getRequestIP(event) ?? null
  })
  scheduleCryptoWithdraw(withdrawal.id)

  return { withdrawal }
})
