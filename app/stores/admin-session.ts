import { defineStore } from 'pinia'
import type { AdminSession, AdminLoginInput } from '~~/shared/types/admin'
import { extractErrorMessage } from '~/composables/useApiResource'

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export const useAdminSessionStore = defineStore('admin-session', () => {
  const session = ref<AdminSession | null>(null)
  const status = ref<SessionStatus>('idle')
  const error = ref<string | null>(null)

  const admin = computed(() => session.value?.admin ?? null)
  const isAuthenticated = computed(() => status.value === 'authenticated')

  async function init() {
    if (status.value === 'authenticated' || status.value === 'loading') return
    status.value = 'loading'
    try {
      const res = await $fetch<{ session: AdminSession }>('/api/admin/auth/me', { headers: ssrCookieHeaders() })
      session.value = res.session
      status.value = 'authenticated'
    } catch {
      session.value = null
      status.value = 'anonymous'
    }
  }

  async function login(input: AdminLoginInput) {
    status.value = 'loading'
    error.value = null
    try {
      const res = await $fetch<{ session: AdminSession }>('/api/admin/auth/login', {
        method: 'POST', body: input, headers: ssrCookieHeaders()
      })
      session.value = res.session
      status.value = 'authenticated'
    } catch (err: unknown) {
      status.value = 'anonymous'
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function logout() {
    try { await $fetch('/api/admin/auth/logout', { method: 'POST' }) } catch {}
    session.value = null
    status.value = 'anonymous'
  }

  return { session, status, error, admin, isAuthenticated, init, login, logout }
})
