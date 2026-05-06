import { useSessionStore } from '~/stores/session'

const PUBLIC_TRADER_PATHS = new Set([
  '/trader',          // marketing landing, intentionally public
  '/trader/login',
  '/trader/register'
])
const KYC_ALLOWED_PATHS = new Set(['/trader/kyc', '/trader/wallet'])
// Paths where an authenticated visit should NOT bounce them elsewhere —
// login/register should bounce to /trader/wallet, but /trader itself is fine to stay
const LOGIN_REDIRECT_PATHS = new Set(['/trader/login', '/trader/register'])

export default defineNuxtRouteMiddleware(async (to) => {
  // Only guard trader area
  if (!to.path.startsWith('/trader')) return

  const session = useSessionStore()
  if (session.status === 'idle') {
    await session.init()
  }

  const isPublic = PUBLIC_TRADER_PATHS.has(to.path)

  if (!session.isAuthenticated) {
    if (isPublic) return
    return navigateTo(`/trader/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // Authenticated — bounce off login/register only, keep /trader accessible
  if (LOGIN_REDIRECT_PATHS.has(to.path)) {
    return navigateTo('/trader/wallet')
  }

  // KYC gating
  const kycOk = session.kycStatus === 'approved'
  if (!kycOk && !KYC_ALLOWED_PATHS.has(to.path)) {
    return navigateTo('/trader/kyc')
  }
})
