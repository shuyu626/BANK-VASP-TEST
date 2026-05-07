import { defineStore } from 'pinia'
import type { AuthSession, RegisterInput, LoginInput } from '~~/shared/types'
import { extractErrorMessage } from '~/composables/useApiResource'

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

interface LoginResult {
  step: 'authenticated' | 'totp_required'
  challengeId?: string
}

export const useSessionStore = defineStore('session', () => {
  const session = ref<AuthSession | null>(null)
  const status = ref<SessionStatus>('idle')
  const error = ref<string | null>(null)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => status.value === 'authenticated')
  const kycStatus = computed(() => session.value?.user.kycStatus ?? null)
  const kycTier = computed(() => session.value?.user.kycTier ?? 'tier0')

  async function init() {
    if (status.value === 'authenticated' || status.value === 'loading') return
    status.value = 'loading'
    try {
      // Forward incoming request cookies on SSR so the in-server $fetch
      // can reach /api/trader/auth/me with the trader_sid cookie
      const res = await $fetch<{ session: AuthSession }>('/api/trader/auth/me', { headers: ssrCookieHeaders() })
      session.value = res.session
      status.value = 'authenticated'
    } catch {
      session.value = null
      status.value = 'anonymous'
    }
  }

  async function register(input: RegisterInput) {
    status.value = 'loading'
    error.value = null
    try {
      const res = await $fetch<{ step: 'authenticated'; session: AuthSession }>(
        '/api/trader/auth/register',
        { method: 'POST', body: input }
      )
      session.value = res.session
      status.value = 'authenticated'
    } catch (err: unknown) {
      status.value = 'anonymous'
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function login(input: LoginInput): Promise<LoginResult> {
    status.value = 'loading'
    error.value = null
    try {
      const res = await $fetch<
        | { step: 'authenticated'; session: AuthSession }
        | { step: 'totp_required'; challengeId: string }
      >('/api/trader/auth/login', { method: 'POST', body: input })

      if (res.step === 'authenticated') {
        session.value = res.session
        status.value = 'authenticated'
        return { step: 'authenticated' }
      }
      status.value = 'anonymous'
      return { step: 'totp_required', challengeId: res.challengeId }
    } catch (err: unknown) {
      status.value = 'anonymous'
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function submitTotp(challengeId: string, code: string) {
    status.value = 'loading'
    error.value = null
    try {
      const res = await $fetch<{ step: 'authenticated'; session: AuthSession }>(
        '/api/trader/auth/login/totp',
        { method: 'POST', body: { sessionChallengeId: challengeId, code } }
      )
      session.value = res.session
      status.value = 'authenticated'
    } catch (err: unknown) {
      status.value = 'anonymous'
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  async function logout() {
    try {
      await $fetch('/api/trader/auth/logout', { method: 'POST' })
    } catch {
      // swallow — still clear local state
    }
    session.value = null
    status.value = 'anonymous'
    error.value = null
  }

  function patchUser(patch: Partial<AuthSession['user']>) {
    if (!session.value) return
    session.value = {
      ...session.value,
      user: { ...session.value.user, ...patch }
    }
  }

  return {
    session, status, error,
    user, isAuthenticated, kycStatus, kycTier,
    init, register, login, submitTotp, logout, patchUser
  }
})
