// 各領域「狀態 → BaseBadge variant」對應表。
// 故意不做成單一 map：approved 在 KYC = success（通過），
// 在出入金 = warning（已核准但未撥款），語意不同須分開。

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'

export function kycVariant(status: string): BadgeVariant {
  return ({
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    resubmit: 'info'
  } as const)[status] ?? 'neutral'
}

export function riskVariant(level: string): BadgeVariant {
  return ({
    low: 'success',
    medium: 'info',
    high: 'warning',
    critical: 'danger'
  } as const)[level] ?? 'neutral'
}

export function fiatTxnVariant(status: string): BadgeVariant {
  return ({
    pending: 'warning',
    reviewing: 'info',
    approved: 'warning',
    completed: 'success',
    rejected: 'danger',
    failed: 'danger'
  } as const)[status] ?? 'neutral'
}

export function orderStatusVariant(status: string): BadgeVariant {
  return ({
    open: 'warning',
    partial: 'warning',
    filled: 'success',
    cancelled: 'neutral',
    rejected: 'danger'
  } as const)[status] ?? 'neutral'
}

export function reportStatusVariant(status: string): BadgeVariant {
  return ({
    draft: 'warning',
    submitted: 'info',
    accepted: 'success',
    under_review: 'info'
  } as const)[status] ?? 'neutral'
}

/** Trader 端視角：approved 仍視為處理中（warning），completed 才是綠 */
export function transferStatusVariant(status: string): BadgeVariant {
  return ({
    pending: 'warning',
    approved: 'warning',
    completed: 'success',
    rejected: 'danger',
    failed: 'danger'
  } as const)[status] ?? 'neutral'
}
