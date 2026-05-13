import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/require-admin'
import { traderStore } from '~~/server/utils/trader-store'
import { applyAuditWindow } from '~~/server/utils/audit-window'

const QuerySchema = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(5000)
})

export default defineEventHandler((event) => {
  requireAdmin(event)
  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const { since, until, limit } = parsed.data
  const all = traderStore.getAuditLog()
  const entries = applyAuditWindow(all, since, until, limit)
  return { entries, totalInLog: all.length }
})
