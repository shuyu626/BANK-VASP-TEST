import { describe, expect, it } from 'vitest'
import type { AuditLog } from '~~/shared/types'
import { applyAuditWindow } from '~~/server/utils/audit-window'

const mk = (id: string, ts: string): AuditLog => ({
  id,
  actor: 'a',
  actorRole: 'system',
  action: 'x',
  resourceType: 'r',
  resourceId: 'rid',
  metadata: {},
  ipAddress: null,
  timestamp: ts
})

describe('applyAuditWindow', () => {
  it('returns entries within [since, until], inclusive bounds', () => {
    const entries = [
      mk('1', '2026-04-01T00:00:00Z'),
      mk('2', '2026-04-15T00:00:00Z'),
      mk('3', '2026-05-01T00:00:00Z')
    ]
    const out = applyAuditWindow(entries, '2026-04-10T00:00:00Z', '2026-04-30T00:00:00Z', 100)
    expect(out.map(e => e.id)).toEqual(['2'])
  })

  it('sorts by timestamp desc', () => {
    const entries = [
      mk('1', '2026-04-01T00:00:00Z'),
      mk('2', '2026-05-01T00:00:00Z'),
      mk('3', '2026-04-15T00:00:00Z')
    ]
    const out = applyAuditWindow(entries, undefined, undefined, 100)
    expect(out.map(e => e.id)).toEqual(['2', '3', '1'])
  })

  it('truncates to limit after sort', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      mk(String(i), `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`)
    )
    const out = applyAuditWindow(entries, undefined, undefined, 3)
    expect(out).toHaveLength(3)
    expect(out[0]!.id).toBe('9')
    expect(out[2]!.id).toBe('7')
  })

  it('without until, future-dated entries beyond now are excluded', () => {
    const past = mk('past', '2026-04-01T00:00:00Z')
    const future = mk('future', new Date(Date.now() + 86400000).toISOString())
    const out = applyAuditWindow([past, future], undefined, undefined, 100)
    expect(out.map(e => e.id)).toEqual(['past'])
  })

  it('without since, returns all up to until/now', () => {
    const entries = [
      mk('1', '2025-01-01T00:00:00Z'),
      mk('2', '2026-04-01T00:00:00Z')
    ]
    const out = applyAuditWindow(entries, undefined, '2026-12-31T00:00:00Z', 100)
    expect(out.map(e => e.id)).toEqual(['2', '1'])
  })
})
