import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'

const QuerySchema = z.object({
  actorRole: z.string().optional(),
  action: z.string().optional(),
  actor: z.string().optional(),
  resourceId: z.string().optional(),
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100)
})

export default defineEventHandler((event) => {
  requireAdmin(event)
  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { actorRole, action: actionPrefix, actor, resourceId, since, limit } = parsed.data

  let entries = traderStore.getAuditLog()
  if (actorRole) entries = entries.filter(e => e.actorRole === actorRole)
  if (actionPrefix) entries = entries.filter(e => e.action.startsWith(actionPrefix))
  if (actor) entries = entries.filter(e => e.actor === actor)
  if (resourceId) entries = entries.filter(e => e.resourceId === resourceId)
  if (since) entries = entries.filter(e => e.timestamp >= since)

  entries = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit)

  return { entries, totalInLog: traderStore.getAuditLog().length }
})
