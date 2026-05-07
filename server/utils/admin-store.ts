import type { AdminUser, AdminSession, AdminRole } from '~~/shared/types/admin'

interface AdminRecord {
  user: AdminUser
  password: string
}

const SEED: AdminRecord[] = [
  {
    user: { id: 'admin_01', email: 'compliance@taiex.local', displayName: '合規審核員', role: 'compliance', createdAt: '2026-01-01T00:00:00Z' },
    password: 'admin'
  },
  {
    user: { id: 'admin_02', email: 'ops@taiex.local', displayName: '營運管理員', role: 'ops', createdAt: '2026-01-01T00:00:00Z' },
    password: 'admin'
  },
  {
    user: { id: 'admin_03', email: 'risk@taiex.local', displayName: '風控員', role: 'risk', createdAt: '2026-01-01T00:00:00Z' },
    password: 'admin'
  }
]

let initialized = false
const byEmail = new Map<string, AdminRecord>()
const byId = new Map<string, AdminRecord>()
const sessions = new Map<string, AdminSession>()

function ensureSeeded() {
  if (initialized) return
  initialized = true
  for (const r of SEED) {
    byEmail.set(r.user.email.toLowerCase(), r)
    byId.set(r.user.id, r)
  }
}

export const adminStore = {
  findByEmail(email: string): AdminRecord | undefined {
    ensureSeeded()
    return byEmail.get(email.toLowerCase())
  },
  findById(id: string): AdminRecord | undefined {
    ensureSeeded()
    return byId.get(id)
  },
  createSession(adminId: string): AdminSession {
    ensureSeeded()
    const rec = byId.get(adminId)
    if (!rec) throw createError({ statusCode: 404, statusMessage: 'ADMIN_NOT_FOUND' })
    const sessionId = `asess_${Math.random().toString(36).slice(2, 10)}`
    const now = Date.now()
    const session: AdminSession = {
      sessionId,
      admin: rec.user,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    sessions.set(sessionId, session)
    return session
  },
  findSession(sessionId: string): AdminSession | undefined {
    ensureSeeded()
    return sessions.get(sessionId)
  },
  removeSession(sessionId: string): void {
    ensureSeeded()
    sessions.delete(sessionId)
  }
}

export function roleLabel(role: AdminRole): string {
  return { ops: '營運', compliance: '合規', risk: '風控' }[role]
}
