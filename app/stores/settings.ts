import { defineStore } from 'pinia'
import type { ApiKeyRecord, AuditLog, ChangePasswordInput, ToggleTotpInput, CreateApiKeyInput } from '~~/shared/types'
import { extractErrorMessage } from '~/composables/useApiResource'

interface CreatedApiKey extends ApiKeyRecord {
  secret: string
}

export const useSettingsStore = defineStore('settings', () => {
  const apiKeys = ref<ApiKeyRecord[]>([])
  const loginHistory = ref<AuditLog[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const justCreatedKey = ref<CreatedApiKey | null>(null)

  async function loadApiKeys() {
    loading.value = true
    try {
      const res = await $fetch<{ keys: ApiKeyRecord[] }>('/api/trader/settings/api-keys', { headers: ssrCookieHeaders() })
      apiKeys.value = res.keys
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const res = await $fetch<CreatedApiKey>('/api/trader/settings/api-keys', {
      method: 'POST', body: input, headers: ssrCookieHeaders()
    })
    apiKeys.value = [{ ...res, lastUsedAt: null }, ...apiKeys.value]
    justCreatedKey.value = res
    return res
  }

  function dismissCreated() { justCreatedKey.value = null }

  async function deleteApiKey(id: string) {
    await $fetch(`/api/trader/settings/api-keys/${id}`, { method: 'DELETE', headers: ssrCookieHeaders() })
    apiKeys.value = apiKeys.value.filter(k => k.id !== id)
  }

  async function changePassword(input: ChangePasswordInput) {
    await $fetch('/api/trader/settings/password', { method: 'POST', body: input, headers: ssrCookieHeaders() })
  }

  async function toggleTotp(input: ToggleTotpInput) {
    return $fetch<{ ok: true; twoFaEnabled: boolean }>('/api/trader/settings/totp', {
      method: 'POST', body: input, headers: ssrCookieHeaders()
    })
  }

  async function loadLoginHistory() {
    try {
      const res = await $fetch<{ history: AuditLog[] }>('/api/trader/settings/login-history', { headers: ssrCookieHeaders() })
      loginHistory.value = res.history
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  return {
    apiKeys, loginHistory, loading, error, justCreatedKey,
    loadApiKeys, createApiKey, dismissCreated, deleteApiKey,
    changePassword, toggleTotp, loadLoginHistory
  }
})
