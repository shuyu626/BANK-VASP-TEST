import { AdminLoginInputSchema } from '~~/shared/types/admin'
import { adminStore } from '~~/server/utils/admin-store'
import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'admin_sid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = AdminLoginInputSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })

  const record = adminStore.findByEmail(parsed.data.email)
  if (!record || record.password !== parsed.data.password) {
    throw createError({ statusCode: 401, statusMessage: 'INVALID_CREDENTIALS' })
  }
  const session = adminStore.createSession(record.user.id)
  setCookie(event, COOKIE_NAME, session.sessionId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60
  })
  traderStore.appendAudit({
    actor: record.user.id, actorRole: record.user.role,
    action: 'admin.login', resourceType: 'session', resourceId: session.sessionId,
    metadata: {}, ipAddress: getRequestIP(event) ?? null
  })
  return { session }
})
