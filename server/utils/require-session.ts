import type { H3Event } from 'h3'
import type { AuthSession } from '~~/shared/types'
import { traderStore } from './trader-store'

const COOKIE_NAME = 'trader_sid'

export function requireSession(event: H3Event): AuthSession {
  const sid = getCookie(event, COOKIE_NAME)
  const session = sid ? traderStore.findSession(sid) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }
  return session
}
