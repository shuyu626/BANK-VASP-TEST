import type { CryptoAddressBookEntry } from '~~/shared/types'
import { AddAddressBookInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'
import { TRANSFER_FEES } from '~~/shared/types/transfer-fees'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = AddAddressBookInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  const feeCfg = TRANSFER_FEES.cryptoWithdraw[parsed.data.asset]
  if (!feeCfg) {
    throw createError({ statusCode: 400, statusMessage: 'UNSUPPORTED_ASSET' })
  }
  if (feeCfg.network !== parsed.data.network) {
    throw createError({ statusCode: 400, statusMessage: 'NETWORK_MISMATCH' })
  }

  const entry: CryptoAddressBookEntry = {
    id: `ab_${Math.random().toString(36).slice(2, 10)}`,
    userId: session.user.id,
    asset: parsed.data.asset,
    network: parsed.data.network,
    address: parsed.data.address,
    label: parsed.data.label,
    addedAt: new Date().toISOString()
  }
  traderStore.addAddressBookEntry(entry)
  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: 'crypto.address_book.add',
    resourceType: 'address_book', resourceId: entry.id,
    metadata: { asset: entry.asset, network: entry.network }, ipAddress: getRequestIP(event) ?? null
  })
  return { entry }
})
