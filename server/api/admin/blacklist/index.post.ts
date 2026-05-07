import { AddBlacklistInputSchema } from '~~/shared/types'
import { blacklistStore } from '~~/server/utils/blacklist-store'
import { traderStore } from '~~/server/utils/trader-store'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const body = await readBody(event)
  const parsed = AddBlacklistInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  if (blacklistStore.hasPattern(parsed.data.pattern)) {
    throw createError({ statusCode: 409, statusMessage: 'DUPLICATE_PATTERN' })
  }

  const entry = blacklistStore.add(parsed.data)
  traderStore.appendAudit({
    actor: admin.admin.id,
    actorRole: admin.admin.role,
    action: 'compliance.blacklist.add',
    resourceType: 'blacklist',
    resourceId: entry.id,
    metadata: { pattern: entry.pattern, source: entry.source },
    ipAddress: getRequestIP(event) ?? null
  })
  return { entry }
})
