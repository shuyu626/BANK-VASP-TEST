import { adminStore } from '~~/server/utils/admin-store'

const COOKIE_NAME = 'admin_sid'

export default defineEventHandler((event) => {
  const sid = getCookie(event, COOKIE_NAME)
  if (sid) adminStore.removeSession(sid)
  deleteCookie(event, COOKIE_NAME, { path: '/' })
  return { ok: true }
})
