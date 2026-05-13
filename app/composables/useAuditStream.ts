import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { AuditLog } from '~~/shared/types'
import { extractErrorMessage } from './useApiResource'

export interface AuditFilters {
  searchText: string
  actorRole: string
  actionPrefix: string
  actor: string
  resourceId: string
  windowStart: string
  windowEnd: string
}

interface AuditApiResponse {
  entries: AuditLog[]
  totalInLog: number
}

interface JumpToDateOk {
  index: number
}
interface JumpToDateErr {
  error: 'no-data'
  oldest: string | null
}
export type JumpToDateResult = JumpToDateOk | JumpToDateErr

export interface UseAuditStreamReturn {
  filters: Ref<AuditFilters>
  allEntries: Ref<AuditLog[]>
  filteredEntries: ComputedRef<AuditLog[]>
  totalInStore: Ref<number>
  isLoading: Ref<boolean>
  isLoadingMore: Ref<boolean>
  error: Ref<string | null>
  selectedId: Ref<string | null>
  selectedEntry: ComputedRef<AuditLog | null>
  loadInitial: () => Promise<void>
  loadEarlier: (days?: number) => Promise<void>
  jumpToDate: (date: string) => Promise<JumpToDateResult>
  exportCsv: () => void
  resetFilters: () => void
}

function defaultFilters(): AuditFilters {
  const now = new Date()
  return {
    searchText: '',
    actorRole: '',
    actionPrefix: '',
    actor: '',
    resourceId: '',
    windowStart: new Date(now.getTime() - 30 * 86400000).toISOString(),
    windowEnd: now.toISOString()
  }
}

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

function formatFilenameStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function useAuditStream(): UseAuditStreamReturn {
  const filters = ref<AuditFilters>(defaultFilters())
  const allEntries = ref<AuditLog[]>([])
  const totalInStore = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<string | null>(null)
  const selectedId = ref<string | null>(null)

  const filteredEntries = computed<AuditLog[]>(() => {
    const f = filters.value
    const search = f.searchText.trim().toLowerCase()
    return allEntries.value.filter(e => {
      if (f.actorRole && e.actorRole !== f.actorRole) return false
      if (f.actionPrefix && !e.action.startsWith(f.actionPrefix)) return false
      if (f.actor && e.actor !== f.actor) return false
      if (f.resourceId && e.resourceId !== f.resourceId) return false
      if (search) {
        const haystack = `${e.actor} ${e.action} ${e.resourceType} ${e.resourceId} ${e.ipAddress ?? ''} ${JSON.stringify(e.metadata)}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  })

  const selectedEntry = computed<AuditLog | null>(() => {
    if (!selectedId.value) return null
    return allEntries.value.find(e => e.id === selectedId.value) ?? null
  })

  async function fetchWindow(since: string, until: string): Promise<AuditApiResponse> {
    return await $fetch<AuditApiResponse>('/api/admin/audit', {
      query: { since, until, limit: 10000 },
      headers: ssrCookieHeaders()
    })
  }

  function mergeAndSort(extra: AuditLog[]): void {
    const existingIds = new Set(allEntries.value.map(e => e.id))
    const merged = [...allEntries.value, ...extra.filter(e => !existingIds.has(e.id))]
    merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    allEntries.value = merged
  }

  async function loadInitial(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetchWindow(filters.value.windowStart, filters.value.windowEnd)
      allEntries.value = [...res.entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      totalInStore.value = res.totalInLog
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadEarlier(days = 30): Promise<void> {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
    error.value = null
    try {
      const oldStart = filters.value.windowStart
      const newStart = new Date(new Date(oldStart).getTime() - days * 86400000).toISOString()
      const res = await fetchWindow(newStart, oldStart)
      mergeAndSort(res.entries)
      filters.value.windowStart = newStart
      totalInStore.value = res.totalInLog
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      isLoadingMore.value = false
    }
  }

  async function jumpToDate(date: string): Promise<JumpToDateResult> {
    const targetStart = `${date}T00:00:00.000Z`
    if (targetStart < filters.value.windowStart) {
      isLoadingMore.value = true
      try {
        const expandedStart = new Date(new Date(targetStart).getTime() - 7 * 86400000).toISOString()
        const res = await fetchWindow(expandedStart, filters.value.windowStart)
        mergeAndSort(res.entries)
        filters.value.windowStart = expandedStart
        totalInStore.value = res.totalInLog
      } catch (err: unknown) {
        error.value = extractErrorMessage(err)
      } finally {
        isLoadingMore.value = false
      }
    }
    const idx = filteredEntries.value.findIndex(e => e.timestamp.slice(0, 10) === date)
    if (idx === -1) {
      const oldest = allEntries.value[allEntries.value.length - 1]?.timestamp.slice(0, 10) ?? null
      return { error: 'no-data', oldest }
    }
    return { index: idx }
  }

  function exportCsv(): void {
    const header = 'timestamp,actorRole,actor,action,resourceType,resourceId,ipAddress,metadata'
    const rows = filteredEntries.value.map(e =>
      [
        e.timestamp,
        e.actorRole,
        e.actor,
        e.action,
        e.resourceType,
        e.resourceId,
        e.ipAddress ?? '',
        JSON.stringify(e.metadata)
      ]
        .map(csvEscape)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${formatFilenameStamp(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function resetFilters(): void {
    filters.value = defaultFilters()
    selectedId.value = null
  }

  return {
    filters,
    allEntries,
    filteredEntries,
    totalInStore,
    isLoading,
    isLoadingMore,
    error,
    selectedId,
    selectedEntry,
    loadInitial,
    loadEarlier,
    jumpToDate,
    exportCsv,
    resetFilters
  }
}
