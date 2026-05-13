import type { AuditLog } from '~~/shared/types'
import { createSeededRandom, hashSeed } from './seed'

interface AuditSeedOptions {
  count: number
  now: number
}

const ACTOR_ROLES: AuditLog['actorRole'][] = ['user', 'admin', 'compliance', 'ops', 'risk', 'bank', 'system']

const ACTIONS_BY_DOMAIN: Record<string, string[]> = {
  kyc: ['kyc.submit', 'kyc.approve', 'kyc.reject', 'kyc.tier-upgrade', 'kyc.review.start', 'kyc.review.escalate'],
  risk: ['risk.alert.trigger', 'risk.alert.resolve', 'risk.alert.escalate', 'risk.threshold.update'],
  fiat: ['fiat.deposit.confirm', 'fiat.deposit.hold', 'fiat.deposit.release', 'fiat.withdraw.request', 'fiat.withdraw.approve', 'fiat.withdraw.reject'],
  order: ['order.place', 'order.cancel', 'order.fill'],
  report: ['report.ctr.create', 'report.ctr.submit', 'report.sar.create', 'report.sar.submit', 'report.regulator.export'],
  auth: ['auth.login', 'auth.logout', 'auth.password-change', 'auth.2fa.enable']
}

const RESOURCE_TYPES = ['kyc', 'aml', 'deposit', 'withdrawal', 'order', 'session', 'ctr', 'sar', 'user', 'setting']

const DECAY_BUCKETS: Array<{ minDays: number; maxDays: number; weight: number }> = [
  { minDays: 0, maxDays: 7, weight: 4 },
  { minDays: 7, maxDays: 30, weight: 3 },
  { minDays: 30, maxDays: 90, weight: 2 },
  { minDays: 90, maxDays: 365, weight: 1 }
]

const TOTAL_WEIGHT = DECAY_BUCKETS.reduce((s, b) => s + b.weight, 0)

function pickBucket(r: number): { minDays: number; maxDays: number } {
  let acc = 0
  for (const b of DECAY_BUCKETS) {
    acc += b.weight
    if (r * TOTAL_WEIGHT <= acc) return b
  }
  return DECAY_BUCKETS[DECAY_BUCKETS.length - 1]!
}

export function generateAuditSeed(opts: AuditSeedOptions): AuditLog[] {
  const { count, now } = opts
  const rand = createSeededRandom(hashSeed(`audit-seed-${count}-${now}`))
  const allActions = Object.values(ACTIONS_BY_DOMAIN).flat()

  const out: AuditLog[] = []
  for (let i = 0; i < count; i++) {
    const bucket = pickBucket(rand())
    const offsetDays = bucket.minDays + rand() * (bucket.maxDays - bucket.minDays)
    const ts = new Date(now - offsetDays * 86400000 - rand() * 86400000).toISOString()

    const action = allActions[Math.floor(rand() * allActions.length)]!
    const actorRole = ACTOR_ROLES[Math.floor(rand() * ACTOR_ROLES.length)]!
    const resourceType = RESOURCE_TYPES[Math.floor(rand() * RESOURCE_TYPES.length)]!
    const isLargeMeta = rand() < 0.07

    out.push({
      id: `log_g_${i.toString(36).padStart(6, '0')}`,
      actor: actorRole === 'system' ? 'system' : `${actorRole}_${Math.floor(rand() * 50).toString().padStart(2, '0')}`,
      actorRole,
      action,
      resourceType,
      resourceId: `${resourceType}_${Math.floor(rand() * 9999).toString().padStart(4, '0')}`,
      metadata: isLargeMeta
        ? {
            trace: 'x'.repeat(600),
            note: 'oversized metadata for detail panel scroll verification',
            nested: {
              keys: Array.from({ length: 5 }, (_, k) => ({ k, v: rand(), label: `nested-key-${k}` })),
              tags: ['compliance', 'audit', 'large-meta', `bucket-${bucket.maxDays}d`]
            }
          }
        : { source: action.split('.')[0]! },
      ipAddress: rand() < 0.7 ? `10.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}` : null,
      timestamp: ts
    })
  }
  return out
}
