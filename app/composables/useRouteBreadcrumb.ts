import type { BreadcrumbItem } from '~/components/common/BaseBreadcrumb.vue'

// 完整路徑 → 對應 i18n key。
// 沒列在這裡的 segment 視為「動態參數」或「未命名段落」，由 fallback 邏輯處理。
const PATH_LABEL_MAP: Record<string, string> = {
  // ── trader ─────────────────────────────────────
  '/trader': 'errorPage.section.trader',
  '/trader/markets': 'trader.nav.markets',
  '/trader/trade': 'trader.nav.trade',
  '/trader/wallet': 'trader.menu.wallet',
  '/trader/wallet/deposit-fiat': 'components.breadcrumb.label.depositFiat',
  '/trader/wallet/withdraw-fiat': 'components.breadcrumb.label.withdrawFiat',
  '/trader/wallet/withdraw-crypto': 'components.breadcrumb.label.withdrawCrypto',
  '/trader/wallet/bank-accounts': 'trader.nav.bankAccounts',
  '/trader/orders': 'trader.menu.orders',
  '/trader/orders/trades': 'components.breadcrumb.label.trades',
  '/trader/kyc': 'trader.menu.kyc',
  '/trader/settings': 'trader.menu.settings',
  '/trader/settings/profile': 'components.breadcrumb.label.profile',
  '/trader/settings/security': 'components.breadcrumb.label.security',
  '/trader/settings/preferences': 'components.breadcrumb.label.preferences',
  '/trader/settings/api-keys': 'components.breadcrumb.label.apiKeys',
  // ── admin ──────────────────────────────────────
  '/admin': 'errorPage.section.admin',
  '/admin/kyc': 'admin.nav.kyc',
  '/admin/users': 'admin.nav.users',
  '/admin/risk': 'admin.nav.risk',
  '/admin/orderbook': 'admin.nav.orderbook',
  '/admin/fiat': 'admin.nav.fiat',
  '/admin/audit': 'admin.nav.audit',
  '/admin/reports': 'admin.nav.reports',
  '/admin/blacklist': 'admin.nav.blacklist',
  // ── bank ───────────────────────────────────────
  '/bank': 'errorPage.section.bank',
  '/bank/trust-accounts': 'bank.nav.trustAccounts',
  '/bank/kyc-match': 'bank.nav.kycMatch',
  '/bank/reconciliation': 'bank.nav.reconciliation',
  '/bank/aml': 'bank.nav.aml',
  '/bank/ctr': 'bank.nav.ctr',
  '/bank/sar': 'bank.nav.sar',
  '/bank/regulator-reports': 'bank.nav.regulatorReports',
  '/bank/blacklist': 'bank.nav.blacklist',
}

// 這些節點只當 breadcrumb 分類，不提供可點擊連結
const NON_NAVIGABLE: ReadonlySet<string> = new Set([
  '/trader/trade', // 真正的路由是 /trader/trade/[symbol]
])

// 這些路由不顯示 breadcrumb（首頁、登入等入口頁）
const SUPPRESS_AT: ReadonlySet<string> = new Set([
  '/',
  '/trader',
  '/trader/login',
  '/trader/register',
  '/admin',
  '/admin/login',
  '/bank',
])

/**
 * 依當前 route 自動產生 BaseBreadcrumb items。
 *
 * 規則：
 * - 第一個節點固定為「首頁」（home icon, iconOnly）
 * - 後續節點依 path segment 拆解，從 PATH_LABEL_MAP 取對應 i18n key
 * - 未命中 map 的 segment 視為動態參數（如 [id] / [symbol] / [date]），label 顯示為 `#<value>`
 * - 最後一個節點不渲染連結（由 BaseBreadcrumb 內部標記 aria-current="page"）
 * - 在 SUPPRESS_AT 列表內的路由直接回傳空陣列（layout 端會 v-if 收掉整個 nav）
 */
export function useRouteBreadcrumb() {
  const route = useRoute()           // 取得目前路由資訊
  const { t, te } = useI18n()        // t: 翻譯；te: 檢查 key 是否存在

  // computed 讓 breadcrumb 對 route 變化自動響應更新
  return computed<BreadcrumbItem[]>(() => {
    // 去掉尾端斜線，避免 /admin/users/ 和 /admin/users 判成不同路徑
    const path = route.path.replace(/\/+$/, '') || '/'

    // 在 suppress 清單內，直接不顯示 breadcrumb
    if (SUPPRESS_AT.has(path)) return []

    // 將路徑拆成 segment，例如 /admin/users/123 -> ['admin','users','123']
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) return []

    // 第一顆固定是首頁 icon
    const items: BreadcrumbItem[] = [
      { label: t('hub.title'), to: '/', icon: 'lucide:home', iconOnly: true },
    ]

    // 累加路徑用來查 PATH_LABEL_MAP
    // i=0 時 cumulative='/admin'
    // i=1 時 cumulative='/admin/users'
    let cumulative = ''

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!                // 目前 segment
      cumulative += '/' + segment                 // 逐步累加成完整節點路徑
      const isLast = i === segments.length - 1    // 是否最後一顆

      const labelKey = PATH_LABEL_MAP[cumulative] // 優先用對照表找 i18n key
      let label: string

      if (labelKey && te(labelKey)) {
        // key 存在且翻譯檔也有，直接翻譯
        label = t(labelKey)
      } else {
        // fallback：通常是動態參數或未命名段落
        const decoded = safeDecode(segment)

        // 若 decoded 值與 route.params 某值相同，視為動態參數，前面加 #
        const matched = Object.values(route.params).some(
          v => typeof v === 'string' && v === decoded,
        )

        label = matched ? `#${decoded}` : decoded
      }

      items.push({
        label,
        // 最後一顆一律不可點；NON_NAVIGABLE 也不可點
        to: isLast || NON_NAVIGABLE.has(cumulative) ? undefined : cumulative,
      })
    }

    return items
  })
}

// 安全 decode，避免非法字串造成 decodeURIComponent throw
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
