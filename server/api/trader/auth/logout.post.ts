import { traderStore } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler((event) => {
  const sid = getCookie(event, COOKIE_NAME)
  if (sid) traderStore.removeSession(sid)
  deleteCookie(event, COOKIE_NAME, { path: '/' })
  return { ok: true }
})
