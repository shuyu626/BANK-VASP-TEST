// Bank 端 dashboard 聚合邏輯：信託總額、當日金流、合規待辦
// 從 server/api/bank/dashboard.get.ts 抽出，符合「handler 只做驗證 + 呼叫 utils」原則。

import { traderStore } from './trader-store'
import { amlStore } from './aml-store'
import { reportStore } from './report-store'

export interface DailyFiatSummary {
  depositCount: number
  withdrawCount: number
  /** 已 completed 的入金總額（TWD） */
  depositAmount: number
  /** 已 completed 的出金總額（TWD） */
  withdrawAmount: number
}

export interface TrustSummary {
  totalBalance: number
  accountCount: number
}

export interface ComplianceSummary {
  ctrDraft: number
  sarUnderReview: number
  openAlerts: number
  pendingKycMatch: number
}

export interface OpenAlertWithUser {
  alert: ReturnType<typeof amlStore.listOpen>[number]
  user: { id: string; displayName: string } | null
}

export interface BankDashboardSummary {
  today: { date: string } & DailyFiatSummary
  trust: TrustSummary
  compliance: ComplianceSummary
  openAlerts: OpenAlertWithUser[]
}

/** 計算指定日期（YYYY-MM-DD）的當日法幣金流 + 信託總額。 */
export function aggregateDailyFiatAndTrust(date: string): {
  daily: DailyFiatSummary
  trust: TrustSummary
} {
  const users = traderStore.listAllUsers()
  let trustTotal = 0
  let trustAccountCount = 0
  const daily: DailyFiatSummary = {
    depositCount: 0,
    withdrawCount: 0,
    depositAmount: 0,
    withdrawAmount: 0
  }

  for (const u of users) {
    const ta = traderStore.getTrustAccount(u.id)
    if (ta) {
      trustTotal += ta.balance
      trustAccountCount++
    }
    for (const d of traderStore.getFiatDeposits(u.id)) {
      if (d.submittedAt.startsWith(date)) {
        daily.depositCount++
        if (d.status === 'completed') daily.depositAmount += d.amount
      }
    }
    for (const w of traderStore.getFiatWithdrawals(u.id)) {
      if (w.submittedAt.startsWith(date)) {
        daily.withdrawCount++
        if (w.status === 'completed') daily.withdrawAmount += w.amount
      }
    }
  }

  return {
    daily,
    trust: { totalBalance: trustTotal, accountCount: trustAccountCount }
  }
}

/** 銀行端視角的合規待辦總計：CTR draft、SAR under_review、AML alert、KYC bank 比對。 */
export function calculateComplianceSummary(): ComplianceSummary {
  const ctrDraft = reportStore.listCtr().filter(r => r.status === 'draft').length
  const sarUnderReview = reportStore.listSar().filter(r => r.status === 'under_review' || r.status === 'draft').length
  const openAlerts = amlStore.listOpen().length
  const pendingKycMatch = traderStore.listAllKycRecords()
    .filter(k => k.status === 'approved' && k.bankVerifiedAt === null).length
  return { ctrDraft, sarUnderReview, openAlerts, pendingKycMatch }
}

/** 取最近 N 筆 open AML alerts 並接上對應 user 顯示名。 */
export function listOpenAlertsWithUser(limit = 10): OpenAlertWithUser[] {
  const users = traderStore.listAllUsers()
  return amlStore.listOpen().slice(0, limit).map(a => {
    const u = users.find(x => x.id === a.userId)
    return { alert: a, user: u ? { id: u.id, displayName: u.displayName } : null }
  })
}

/** 完整 bank dashboard summary（handler 直接 return 用）。 */
export function getBankDashboardSummary(now: Date = new Date()): BankDashboardSummary {
  const date = now.toISOString().slice(0, 10)
  const { daily, trust } = aggregateDailyFiatAndTrust(date)
  return {
    today: { date, ...daily },
    trust,
    compliance: calculateComplianceSummary(),
    openAlerts: listOpenAlertsWithUser(10)
  }
}
