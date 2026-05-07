import { TotpInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'
const MOCK_TOTP = '123456'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = TotpInputSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }

  if (parsed.data.code !== MOCK_TOTP) {
    throw createError({ statusCode: 401, statusMessage: 'WRONG_TOTP' })
  }

  const userId = traderStore.resolveTotpChallenge(parsed.data.sessionChallengeId)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'CHALLENGE_EXPIRED' })
  }

  traderStore.clearTotpChallenge(parsed.data.sessionChallengeId)
  const session = traderStore.createSession(userId)

  setCookie(event, COOKIE_NAME, session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  })

  traderStore.appendAudit({
    actor: userId, actorRole: 'user',
    action: 'auth.login', resourceType: 'session', resourceId: session.sessionId,
    metadata: { method: 'totp' },
    ipAddress: getRequestIP(event) ?? null
  })

  return { step: 'authenticated' as const, session }
})
