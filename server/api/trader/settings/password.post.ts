import { ChangePasswordInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = ChangePasswordInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const record = traderStore.findUserById(session.user.id)
  if (!record || record.password !== parsed.data.oldPassword) {
    throw createError({ statusCode: 401, statusMessage: 'WRONG_PASSWORD' })
  }
  traderStore.updatePassword(session.user.id, parsed.data.newPassword)
  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: 'auth.password.change',
    resourceType: 'user', resourceId: session.user.id,
    metadata: {}, ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true }
})
