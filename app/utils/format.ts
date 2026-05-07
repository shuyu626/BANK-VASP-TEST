// 通用顯示格式化 helper。
// 注意：`shared/types/kyc-limits.ts` 已有 formatTwd（-1 會回 "客製"），
// 保留供 KYC 額度顯示使用；本檔是其他一般金額/日期/數量的共用版本。

type DtMode = 'date' | 'datetime' | 'short' | 'minute'

export function fmtDt(iso: string | null | undefined, mode: DtMode = 'datetime'): string {
  if (!iso) return '—'
  switch (mode) {
    case 'date': return iso.slice(0, 10)
    case 'short': return iso.slice(5, 16).replace('T', ' ')
    case 'minute': return iso.slice(0, 16).replace('T', ' ')
    default: return iso.slice(0, 19).replace('T', ' ')
  }
}

export function fmtTwd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `NT$ ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function fmtPrice(n: number, digits = 2): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  })
}

export function fmtPriceAdaptive(n: number): string {
  return n >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toFixed(4)
}

export function fmtQty(n: number, digits = 6): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export function fmtVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toFixed(0)
}
