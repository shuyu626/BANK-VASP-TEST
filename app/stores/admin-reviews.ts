import { defineStore } from 'pinia'
import type {
  AmlAlert, AuditLog, User, FiatDeposit, FiatWithdrawal,
  CtrReport, SarReport, OrderBookSnapshot, Order
} from '~~/shared/types'
import type { ResolveAlertInput, RejectWithdrawalInput, HoldDepositInput } from '~~/shared/types/admin'
import { extractErrorMessage } from '~/composables/useApiResource'

interface AlertRow { alert: AmlAlert; user: User | null }
interface DepositRow { deposit: FiatDeposit; user: { id: string; displayName: string; email: string } | null }
interface WithdrawalRow { withdrawal: FiatWithdrawal; user: { id: string; displayName: string; email: string } | null }
interface ReportRow<T> { report: T; user: { id: string; displayName: string } | null }
interface AdminOrder extends Order {
  owner: { id: string; displayName: string; email: string } | null
  isLarge: boolean
}
interface OrderbookView { symbol: string; book: OrderBookSnapshot; openOrders: AdminOrder[] }

export const useAdminReviewsStore = defineStore('admin-reviews', () => {
  const alerts = ref<AlertRow[]>([])
  const auditEntries = ref<AuditLog[]>([])
  const ctrs = ref<ReportRow<CtrReport>[]>([])
  const sars = ref<ReportRow<SarReport>[]>([])
  const deposits = ref<DepositRow[]>([])
  const withdrawals = ref<WithdrawalRow[]>([])
  const orderbook = ref<OrderbookView | null>(null)
  const loading = ref(false)
  // 共用 error state — 同一頁通常只 load 一份資料，故共用可接受。每個 load 開頭都會 reset。
  const error = ref<string | null>(null)

  async function loadAlerts(params: { status?: string; severity?: string; type?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ items: AlertRow[] }>('/api/admin/risk/alerts', { query: params, headers: ssrCookieHeaders() })
      alerts.value = res.items
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  async function resolveAlert(id: string, input: ResolveAlertInput) {
    await $fetch(`/api/admin/risk/alerts/${id}/resolve`, { method: 'POST', body: input, headers: ssrCookieHeaders() })
  }

  async function loadAudit(params: Record<string, string> = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ entries: AuditLog[]; totalInLog: number }>('/api/admin/audit', { query: params, headers: ssrCookieHeaders() })
      auditEntries.value = res.entries
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  async function loadReports() {
    loading.value = true
    error.value = null
    try {
      const [ctr, sar] = await Promise.all([
        $fetch<{ items: ReportRow<CtrReport>[] }>('/api/admin/reports/ctr', { headers: ssrCookieHeaders() }),
        $fetch<{ items: ReportRow<SarReport>[] }>('/api/admin/reports/sar', { headers: ssrCookieHeaders() })
      ])
      ctrs.value = ctr.items
      sars.value = sar.items
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  async function markReport(type: 'ctr' | 'sar', id: string, status: 'submitted' | 'accepted') {
    await $fetch(`/api/admin/reports/${type}/${id}/mark`, { method: 'POST', body: { status }, headers: ssrCookieHeaders() })
  }

  async function loadDeposits(status?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ items: DepositRow[] }>('/api/admin/fiat/deposits', {
        query: status ? { status } : undefined, headers: ssrCookieHeaders()
      })
      deposits.value = res.items
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  async function loadWithdrawals(status?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ items: WithdrawalRow[] }>('/api/admin/fiat/withdrawals', {
        query: status ? { status } : undefined, headers: ssrCookieHeaders()
      })
      withdrawals.value = res.items
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  async function rejectWithdrawal(id: string, input: RejectWithdrawalInput) {
    await $fetch(`/api/admin/fiat/withdrawals/${id}/reject`, { method: 'POST', body: input, headers: ssrCookieHeaders() })
  }

  async function holdDeposit(id: string, input: HoldDepositInput) {
    await $fetch(`/api/admin/fiat/deposits/${id}/hold`, { method: 'POST', body: input, headers: ssrCookieHeaders() })
  }

  async function releaseDeposit(id: string) {
    await $fetch(`/api/admin/fiat/deposits/${id}/release`, { method: 'POST', headers: ssrCookieHeaders() })
  }

  async function loadOrderbook(slug: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<OrderbookView>(`/api/admin/orderbook/${slug}`, { headers: ssrCookieHeaders() })
      orderbook.value = res
    } catch (err: unknown) { error.value = extractErrorMessage(err) } finally { loading.value = false }
  }

  return {
    alerts, auditEntries, ctrs, sars, deposits, withdrawals, orderbook, loading, error,
    loadAlerts, resolveAlert, loadAudit, loadReports, markReport,
    loadDeposits, loadWithdrawals, rejectWithdrawal, holdDeposit, releaseDeposit, loadOrderbook
  }
})
