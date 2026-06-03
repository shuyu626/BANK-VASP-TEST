// Trader 前台（/trader/*）的全域路由守衛。
// 檔名帶 .global → Nuxt 會對「每一次」路由切換自動執行，不需在頁面手動掛 middleware。
// 職責：依「是否登入 / KYC 是否通過」決定放行或導向，集中管理進站權限。
import { useSessionStore } from '~/stores/session'

// 免登入即可瀏覽的公開頁（其餘 /trader/* 一律需登入）
const PUBLIC_TRADER_PATHS = new Set([
  '/trader',          // 行銷入口頁，刻意公開
  '/trader/login',
  '/trader/register',
  '/trader/faq'       // 常見問題（說明性內容），公開
])

// 「KYC 尚未通過」時仍允許進入的頁面白名單；
// 其餘頁面在 KYC 未過時會被導去 /trader/kyc 要求先完成驗證。
const KYC_ALLOWED_PATHS = new Set(['/trader/kyc', '/trader/wallet', '/trader/faq'])

// 已登入者若造訪這些頁，應彈走（已登入就不該再看到登入／註冊頁）；
// 注意 /trader 本身不列入，已登入仍可停留在入口頁。
const LOGIN_REDIRECT_PATHS = new Set(['/trader/login', '/trader/register'])

export default defineNuxtRouteMiddleware(async (to) => {
  // 只守 trader 範圍；其他端（/admin、/bank、/ 等）直接放行交給各自 middleware
  if (!to.path.startsWith('/trader')) return

  // 確保 session 已初始化（首次進站 status 為 idle 時，先還原登入狀態）
  const session = useSessionStore()
  if (session.status === 'idle') {
    await session.init()
  }

  const isPublic = PUBLIC_TRADER_PATHS.has(to.path)

  // ── 未登入 ──
  if (!session.isAuthenticated) {
    if (isPublic) return // 公開頁 → 放行
    // 非公開頁 → 導去登入，並用 redirect 記住原本想去的位置，登入後可導回
    return navigateTo(`/trader/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // ── 已登入 ──
  // 已登入卻又點到登入／註冊頁 → 彈去資產頁（避免重複登入）
  if (LOGIN_REDIRECT_PATHS.has(to.path)) {
    return navigateTo('/trader/wallet')
  }

  // KYC 關卡：尚未通過驗證且目標不在白名單 → 強制先去做 KYC
  const kycOk = session.kycStatus === 'approved'
  if (!kycOk && !KYC_ALLOWED_PATHS.has(to.path)) {
    return navigateTo('/trader/kyc')
  }
})
