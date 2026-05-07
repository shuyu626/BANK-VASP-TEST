import type { CtrReport, SarReport } from '~~/shared/types'
import { mockCtrReports, mockSarReports } from '~~/app/utils/mock/compliance'

// CTR / SAR report store. Seeded from mock; adds drafts as AML alerts fire.
// Day 7 introduces automatic CTR draft creation triggered by large-amount detection.

let initialized = false
const ctrs: CtrReport[] = []
const sars: SarReport[] = []

function ensureSeeded() {
  if (initialized) return
  initialized = true
  for (const r of mockCtrReports) ctrs.push({ ...r })
  for (const r of mockSarReports) sars.push({ ...r })
}

function isoDate(iso?: string) {
  return (iso ?? new Date().toISOString()).slice(0, 10)
}

export const reportStore = {
  listCtr(): CtrReport[] {
    ensureSeeded()
    return [...ctrs].sort((a, b) => b.reportDate.localeCompare(a.reportDate))
  },
  listSar(): SarReport[] {
    ensureSeeded()
    return [...sars].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  getCtr(id: string): CtrReport | undefined { ensureSeeded(); return ctrs.find(r => r.id === id) },
  getSar(id: string): SarReport | undefined { ensureSeeded(); return sars.find(r => r.id === id) },

  // Create or merge CTR draft for (userId, date). If exists, add txId + accumulate amount.
  createCtrDraft(input: { userId: string; amount: number; txId: string; dateIso?: string }): CtrReport {
    ensureSeeded()
    const date = isoDate(input.dateIso)
    const existing = ctrs.find(r => r.userId === input.userId && r.reportDate === date && r.status === 'draft')
    if (existing) {
      if (!existing.txIds.includes(input.txId)) existing.txIds.push(input.txId)
      existing.totalAmount += input.amount
      return existing
    }
    const draft: CtrReport = {
      id: `ctr_auto_${Math.random().toString(36).slice(2, 8)}`,
      userId: input.userId,
      totalAmount: input.amount,
      txIds: [input.txId],
      reportDate: date,
      status: 'draft',
      submittedAt: null
    }
    ctrs.push(draft)
    return draft
  },

  createSarDraft(input: { userId: string; alertId: string; narrative: string; createdBy: string }): SarReport {
    ensureSeeded()
    const draft: SarReport = {
      id: `sar_${Math.random().toString(36).slice(2, 8)}`,
      userId: input.userId,
      alertId: input.alertId,
      narrative: input.narrative,
      status: 'draft',
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      submittedAt: null
    }
    sars.push(draft)
    return draft
  },

  markCtrSubmitted(id: string): CtrReport | undefined {
    ensureSeeded()
    const r = ctrs.find(x => x.id === id)
    if (!r) return undefined
    r.status = 'submitted'
    r.submittedAt = new Date().toISOString()
    return r
  },
  markCtrAccepted(id: string): CtrReport | undefined {
    ensureSeeded()
    const r = ctrs.find(x => x.id === id)
    if (!r) return undefined
    r.status = 'accepted'
    return r
  },
  markSarSubmitted(id: string): SarReport | undefined {
    ensureSeeded()
    const r = sars.find(x => x.id === id)
    if (!r) return undefined
    r.status = 'submitted'
    r.submittedAt = new Date().toISOString()
    return r
  },
  markSarAccepted(id: string): SarReport | undefined {
    ensureSeeded()
    const r = sars.find(x => x.id === id)
    if (!r) return undefined
    r.status = 'accepted'
    return r
  }
}
