import type { H3Event } from 'h3'
import type { AdminSession } from '~~/shared/types/admin'
import { adminStore } from './admin-store'

const COOKIE_NAME = 'admin_sid'

export function requireAdmin(event: H3Event): AdminSession {
  const sid = getCookie(event, COOKIE_NAME)
  const session = sid ? adminStore.findSession(sid) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }
  return session
}
