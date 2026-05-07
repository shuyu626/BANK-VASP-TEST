import { LoginInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = LoginInputSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  const record = traderStore.findUserByEmail(parsed.data.email)
  if (!record || record.password !== parsed.data.password) {
    throw createError({ statusCode: 401, statusMessage: 'INVALID_CREDENTIALS' })
  }

  if (record.totpEnabled) {
    const challengeId = traderStore.createTotpChallenge(record.user.id)
    return { step: 'totp_required' as const, challengeId }
  }

  const session = traderStore.createSession(record.user.id)
  setCookie(event, COOKIE_NAME, session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  })

  traderStore.appendAudit({
    actor: record.user.id, actorRole: 'user',
    action: 'auth.login', resourceType: 'session', resourceId: session.sessionId,
    metadata: { method: 'password' },
    ipAddress: getRequestIP(event) ?? null
  })

  return { step: 'authenticated' as const, session }
})
