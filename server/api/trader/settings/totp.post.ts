import { ToggleTotpInputSchema } from '~~/shared/types'
import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

const MOCK_TOTP = '123456'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody(event)
  const parsed = ToggleTotpInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  if (parsed.data.code !== MOCK_TOTP) {
    throw createError({ statusCode: 401, statusMessage: 'WRONG_TOTP' })
  }
  const record = traderStore.findUserById(session.user.id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })

  if (!parsed.data.enable) {
    if (!parsed.data.password || record.password !== parsed.data.password) {
      throw createError({ statusCode: 401, statusMessage: 'WRONG_PASSWORD' })
    }
  }

  traderStore.setTwoFa(session.user.id, parsed.data.enable)
  traderStore.appendAudit({
    actor: session.user.id, actorRole: 'user',
    action: parsed.data.enable ? 'auth.totp.enable' : 'auth.totp.disable',
    resourceType: 'user', resourceId: session.user.id,
    metadata: {}, ipAddress: getRequestIP(event) ?? null
  })
  return { ok: true, twoFaEnabled: parsed.data.enable }
})
