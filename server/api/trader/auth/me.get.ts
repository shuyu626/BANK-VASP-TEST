import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler((event) => {
  const sid = getCookie(event, COOKIE_NAME)
  if (!sid) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }
  const session = traderStore.findSession(sid)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'SESSION_INVALID' })
  }
  return { session }
})
