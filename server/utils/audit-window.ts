import type { AuditLog } from '~~/shared/types'

// Pure helper for /api/admin/audit. Filters entries to [since, until] (inclusive),
// sorts descending by timestamp, slices to limit. Extracted for unit testability.
export function applyAuditWindow(
  entries: AuditLog[],
  since: string | undefined,
  until: string | undefined,
  limit: number
): AuditLog[] {
  const upper = until ?? new Date().toISOString()
  let out = entries
  if (since) out = out.filter(e => e.timestamp >= since)
  out = out.filter(e => e.timestamp <= upper)
  return [...out].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit)
}
