import { useAdminSessionStore } from '~/stores/admin-session'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  const session = useAdminSessionStore()
  if (session.status === 'idle') await session.init()

  const isLogin = to.path === '/admin/login'

  if (!session.isAuthenticated) {
    if (isLogin) return
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  if (isLogin) return navigateTo('/admin')
})
