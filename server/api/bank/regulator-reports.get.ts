import { reportStore } from '~~/server/utils/report-store'
import { amlStore } from '~~/server/utils/aml-store'

// 監管報送總覽：CTR + SAR 各狀態統計 + 近期報送清單
export default defineEventHandler(() => {
  const ctrs = reportStore.listCtr()
  const sars = reportStore.listSar()

  const ctrStats = {
    draft: ctrs.filter(r => r.status === 'draft').length,
    submitted: ctrs.filter(r => r.status === 'submitted').length,
    accepted: ctrs.filter(r => r.status === 'accepted').length
  }
  const sarStats = {
    draft: sars.filter(r => r.status === 'draft').length,
    underReview: sars.filter(r => r.status === 'under_review').length,
    submitted: sars.filter(r => r.status === 'submitted').length,
    accepted: sars.filter(r => r.status === 'accepted').length
  }

  // 近期報送：所有 status !== draft 的 CTR/SAR 合併按時間排序
  type RecentItem = {
    kind: 'ctr' | 'sar'
    id: string
    status: string
    submittedAt: string | null
    userId: string
    summary: string
  }
  const recent: RecentItem[] = []
  for (const r of ctrs) {
    if (r.status === 'draft') continue
    recent.push({
      kind: 'ctr',
      id: r.id,
      status: r.status,
      submittedAt: r.submittedAt,
      userId: r.userId,
      summary: `累計 ${r.totalAmount.toLocaleString('en-US')} TWD · ${r.txIds.length} 筆`
    })
  }
  for (const r of sars) {
    if (r.status === 'draft') continue
    recent.push({
      kind: 'sar',
      id: r.id,
      status: r.status,
      submittedAt: r.submittedAt,
      userId: r.userId,
      summary: r.narrative.slice(0, 60) + (r.narrative.length > 60 ? '…' : '')
    })
  }
  recent.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

  return {
    ctrStats,
    sarStats,
    openAmlAlerts: amlStore.listOpen().length,
    recent: recent.slice(0, 20)
  }
})
