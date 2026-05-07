import { UpdateProfileInputSchema } from '~~/shared/types'
import { requireSession } from '~~/server/utils/require-session'
import { traderStore } from '~~/server/utils/trader-store'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = UpdateProfileInputSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { issues: parsed.error.issues }
    })
  }

  const record = traderStore.updateProfile(session.user.id, parsed.data)

  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: 'profile.update', resourceType: 'user', resourceId: session.user.id,
    metadata: { fields: Object.keys(parsed.data) },
    ipAddress: getRequestIP(event) ?? null
  })

  return { user: record.user }
})
