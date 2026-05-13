import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AuditLog } from '~~/shared/types'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('ssrCookieHeaders', () => undefined)

import { useAuditStream } from '~/composables/useAuditStream'

const mk = (over: Partial<AuditLog> = {}): AuditLog => ({
  id: over.id ?? 'x',
  actor: over.actor ?? 'admin_01',
  actorRole: over.actorRole ?? 'admin',
  action: over.action ?? 'kyc.approve',
  resourceType: over.resourceType ?? 'kyc',
  resourceId: over.resourceId ?? 'kyc_001',
  metadata: over.metadata ?? {},
  ipAddress: over.ipAddress ?? null,
  timestamp: over.timestamp ?? '2026-05-01T00:00:00Z'
})

describe('useAuditStream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('filters by actorRole exactly', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({ id: '1', actorRole: 'admin', timestamp: '2026-05-02T00:00:00Z' }),
        mk({ id: '2', actorRole: 'compliance', timestamp: '2026-05-01T00:00:00Z' })
      ],
      totalInLog: 2
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.actorRole = 'compliance'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['2'])
  })

  it('actionPrefix is startsWith', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({ id: 'a', action: 'kyc.approve', timestamp: '2026-05-02T00:00:00Z' }),
        mk({ id: 'b', action: 'risk.alert.resolve', timestamp: '2026-05-01T00:00:00Z' })
      ],
      totalInLog: 2
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.actionPrefix = 'kyc.'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['a'])
  })

  it('searchText matches across stringified metadata', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({ id: 'has-meta', metadata: { tier: 'tier3' }, timestamp: '2026-05-02T00:00:00Z' }),
        mk({ id: 'no-meta', metadata: {}, timestamp: '2026-05-01T00:00:00Z' })
      ],
      totalInLog: 2
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.searchText = 'tier3'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['has-meta'])
  })

  it('searchText is case-insensitive', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [mk({ id: '1', actor: 'Bank_Teller_3', timestamp: '2026-05-01T00:00:00Z' })],
      totalInLog: 1
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.searchText = 'bank_teller'
    expect(s.filteredEntries.value).toHaveLength(1)
  })

  it('combines multiple filters with AND logic', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({ id: '1', actorRole: 'admin', action: 'kyc.approve', timestamp: '2026-05-03T00:00:00Z' }),
        mk({ id: '2', actorRole: 'admin', action: 'order.fill', timestamp: '2026-05-02T00:00:00Z' }),
        mk({ id: '3', actorRole: 'compliance', action: 'kyc.review.start', timestamp: '2026-05-01T00:00:00Z' })
      ],
      totalInLog: 3
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.filters.value.actorRole = 'admin'
    s.filters.value.actionPrefix = 'kyc.'
    expect(s.filteredEntries.value.map(e => e.id)).toEqual(['1'])
  })

  it('loadEarlier dedupes by id and keeps merge sorted desc', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [mk({ id: 'b', timestamp: '2026-05-01T00:00:00Z' })],
      totalInLog: 5
    })
    const s = useAuditStream()
    await s.loadInitial()
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({ id: 'a', timestamp: '2026-04-01T00:00:00Z' }),
        mk({ id: 'b', timestamp: '2026-05-01T00:00:00Z' })
      ],
      totalInLog: 5
    })
    await s.loadEarlier(30)
    const ids = s.allEntries.value.map(e => e.id)
    expect(ids).toEqual(['b', 'a'])
  })

  it('exportCsv produces RFC4180-compliant CSV with escaped quotes', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [
        mk({
          id: '1',
          actor: 'note "user"',
          metadata: { msg: 'plain text' },
          timestamp: '2026-05-01T00:00:00Z',
          ipAddress: null
        })
      ],
      totalInLog: 1
    })
    const s = useAuditStream()
    await s.loadInitial()

    const captured: Blob[] = []
    vi.stubGlobal('URL', {
      createObjectURL: (b: Blob) => {
        captured.push(b)
        return 'blob:x'
      },
      revokeObjectURL: () => undefined
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node)
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    s.exportCsv()
    expect(captured).toHaveLength(1)
    const text = await captured[0]!.text()
    const lines = text.split('\n')
    expect(lines[0]).toBe('timestamp,actorRole,actor,action,resourceType,resourceId,ipAddress,metadata')
    // actor field has literal " — should be doubled per RFC4180
    expect(lines[1]).toContain('"note ""user"""')
    // metadata column: JSON.stringify wraps each value in ", csvEscape doubles them again
    expect(lines[1]).toContain('"{""msg"":""plain text""}"')
  })

  it('resetFilters clears selectedId and restores defaults', async () => {
    mockFetch.mockResolvedValueOnce({
      entries: [mk({ id: '1', timestamp: '2026-05-01T00:00:00Z' })],
      totalInLog: 1
    })
    const s = useAuditStream()
    await s.loadInitial()
    s.selectedId.value = '1'
    s.filters.value.actorRole = 'admin'
    s.resetFilters()
    expect(s.selectedId.value).toBe(null)
    expect(s.filters.value.actorRole).toBe('')
  })
})
