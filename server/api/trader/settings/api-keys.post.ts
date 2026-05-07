import { CreateApiKeyInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = CreateApiKeyInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { record, secret } = traderStore.createApiKey(
    session.user.id,
    parsed.data.label,
    parsed.data.permissions
  )
  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: 'apikey.create',
    resourceType: 'apikey', resourceId: record.id,
    metadata: { label: record.label, permissions: record.permissions },
    ipAddress: getRequestIP(event) ?? null
  })
  return { ...record, secret }
})
