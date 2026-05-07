import { defineStore } from 'pinia'
import type { KycRecord, KycStatus, KycTier, KycSubmissionInput } from '~~/shared/types'
import type { KycTierLimit } from '~~/shared/types/kyc-limits'
import { extractErrorMessage } from '~/composables/useApiResource'
import { useNotificationsStore } from './notifications'

export const useKycStore = defineStore('kyc', () => {
  const record = ref<KycRecord | null>(null)
  const currentStatus = ref<KycStatus | null>(null)
  const currentTier = ref<KycTier>('tier0')
  const limits = ref<Record<KycTier, KycTierLimit> | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isApproved = computed(() => currentStatus.value === 'approved')
  const isPending = computed(() => currentStatus.value === 'pending')
  const isRejected = computed(() => currentStatus.value === 'rejected')
  const currentLimit = computed<KycTierLimit | null>(
    () => limits.value?.[currentTier.value] ?? null
  )

  async function loadStatus() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{
        record: KycRecord | null
        currentTier: KycTier
        currentStatus: KycStatus | null
        limits: Record<KycTier, KycTierLimit>
      }>('/api/trader/kyc/status', { headers: ssrCookieHeaders() })
      record.value = res.record
      currentStatus.value = res.currentStatus
      currentTier.value = res.currentTier
      limits.value = res.limits
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function submit(input: KycSubmissionInput) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ record: KycRecord }>('/api/trader/kyc/submit', {
        method: 'POST',
        body: input
      })
      record.value = res.record
      currentStatus.value = res.record.status
      useNotificationsStore().push({
        type: 'kyc',
        level: 'info',
        titleKey: 'trader.notifications.kycSubmitted'
      })
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function upgradeTo(tier: KycTier) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ record: KycRecord }>(
        `/api/trader/kyc/upgrade/${tier}`,
        { method: 'POST' }
      )
      record.value = res.record
      currentStatus.value = res.record.status
      useNotificationsStore().push({
        type: 'kyc',
        level: 'success',
        titleKey: 'trader.notifications.kycUpgraded',
        body: tier
      })
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    record, currentStatus, currentTier, limits, loading, error,
    isApproved, isPending, isRejected, currentLimit,
    loadStatus, submit, upgradeTo
  }
})
