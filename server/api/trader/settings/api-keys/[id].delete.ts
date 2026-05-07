import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const id = getRouterParam(event, 'id') ?? ''
  const ok = traderStore.deleteApiKey(session.user.id, id)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'API_KEY_NOT_FOUND' })
  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: 'apikey.delete',
    resourceType: 'apikey', resourceId: id,
    metadata: {}, ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
