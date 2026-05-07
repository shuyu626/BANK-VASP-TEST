import { blacklistStore } from '~~/server/utils/blacklist-store'
import { traderStore } from '~~/server/utils/trader-store'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler((event) => {
  const admin = requireAdmin(event)
  const id = String(getRouterParam(event, 'id'))

  const removed = blacklistStore.remove(id)
  if (!removed) {
    throw createError({ statusCode: 404, statusMessage: 'BLACKLIST_NOT_FOUND' })
  }

  traderStore.appendAudit({
    actor: admin.admin.id,
    actorRole: admin.admin.role,
    action: 'compliance.blacklist.remove',
    resourceType: 'blacklist',
    resourceId: id,
    metadata: {},
    ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
