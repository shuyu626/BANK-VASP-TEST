import { describe, expect, it } from 'vitest'
import { generateAuditSeed } from '~/utils/mock/audit-seed'

const NOW = new Date('2026-05-08T12:00:00Z').getTime()

describe('generateAuditSeed', () => {
  it('produces the requested number of entries', () => {
    const out = generateAuditSeed({ count: 5000, now: NOW })
    expect(out).toHaveLength(5000)
  })

  it('is deterministic for the same seed input', () => {
    const a = generateAuditSeed({ count: 1000, now: NOW })
    const b = generateAuditSeed({ count: 1000, now: NOW })
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id))
    expect(a.map(e => e.timestamp)).toEqual(b.map(e => e.timestamp))
  })

  it('time distribution skews recent (within tolerance)', () => {
    const out = generateAuditSeed({ count: 10000, now: NOW })
    const ageDays = (iso: string) => (NOW - new Date(iso).getTime()) / 86400000
    const within = (days: number) => out.filter(e => ageDays(e.timestamp) <= days).length
    const last7 = within(7)
    const between7and30 = within(30) - last7
    const between30and90 = within(90) - within(30)
    const between90and365 = within(365) - within(90)
    // 4:3:2:1 over 10000 → 4000:3000:2000:1000, allow ±15%
    expect(last7).toBeGreaterThan(3400)
    expect(last7).toBeLessThan(4600)
    expect(between7and30).toBeGreaterThan(2400)
    expect(between7and30).toBeLessThan(3600)
    expect(between30and90).toBeGreaterThan(1500)
    expect(between30and90).toBeLessThan(2500)
    expect(between90and365).toBeGreaterThan(700)
    expect(between90and365).toBeLessThan(1300)
  })

  it('action vocabulary has at least 25 distinct values', () => {
    const out = generateAuditSeed({ count: 5000, now: NOW })
    const distinct = new Set(out.map(e => e.action))
    expect(distinct.size).toBeGreaterThanOrEqual(25)
  })

  it('every entry has structurally valid AuditLog shape', () => {
    const out = generateAuditSeed({ count: 100, now: NOW })
    const validRoles = ['user', 'admin', 'compliance', 'ops', 'risk', 'bank', 'system']
    out.forEach(e => {
      expect(typeof e.id).toBe('string')
      expect(typeof e.timestamp).toBe('string')
      expect(typeof e.action).toBe('string')
      expect(validRoles).toContain(e.actorRole)
      expect(typeof e.resourceType).toBe('string')
      expect(typeof e.resourceId).toBe('string')
      expect(typeof e.metadata).toBe('object')
    })
  })

  it('roughly 5-10% of entries have large (>500 char) metadata', () => {
    const out = generateAuditSeed({ count: 5000, now: NOW })
    const largeCount = out.filter(e => JSON.stringify(e.metadata).length > 500).length
    const ratio = largeCount / out.length
    expect(ratio).toBeGreaterThan(0.04)
    expect(ratio).toBeLessThan(0.12)
  })
})
