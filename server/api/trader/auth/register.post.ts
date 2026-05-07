import { RegisterInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = RegisterInputSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { issues: parsed.error.issues }
    })
  }

  const { email, password, displayName, agreedTerms, agreedPrivacy, agreedRisk } = parsed.data
  const record = traderStore.createUser({ email, password, displayName })
  const session = traderStore.createSession(record.user.id)

  setCookie(event, COOKIE_NAME, session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  })

  // VASP / AML 法遵：同意條款屬客戶審查紀錄，連同註冊時點寫入稽核日誌（保存 ≥ 5 年）
  traderStore.appendAudit({
    actor: record.user.id, actorRole: 'user',
    action: 'auth.login', resourceType: 'session', resourceId: session.sessionId,
    metadata: {
      method: 'register',
      consent: { terms: agreedTerms, privacy: agreedPrivacy, risk: agreedRisk },
      consentedAt: new Date().toISOString()
    },
    ipAddress: getRequestIP(event) ?? null
  })

  return { step: 'authenticated' as const, session }
})
