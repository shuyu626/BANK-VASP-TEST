<script setup lang="ts">
import type { KycRecord, KycStatus, KycTier } from '~~/shared/types'
import { KYC_TIER_LIMITS } from '~~/shared/types/kyc-limits'
import type { FileSlot } from './KycFileSlot.vue'

defineProps<{
  record: KycRecord
  currentStatus: KycStatus | null
  currentTier: KycTier
  displayName: string | null
  loading: boolean
}>()

const slotProof = defineModel<FileSlot>('slotProof', { required: true })

const emit = defineEmits<{
  upgrade: [tier: 'tier2' | 'tier3']
}>()

const { t } = useI18n()

function statusLabel(status: KycStatus | null): string {
  switch (status) {
    case 'approved': return t('kycStatus.approvedZh')
    case 'pending': return t('kycStatus.pendingZh')
    case 'rejected': return t('kycStatus.rejectedZh')
    case 'resubmit': return t('kycStatus.resubmitZh')
    default: return t('trader.wallet.kycGate.statusUnknown')
  }
}

function badgeClass(status: KycStatus | null): string {
  if (status === 'approved') return 'bg-success text-white'
  if (status === 'rejected') return 'bg-danger text-white'
  return 'bg-warning text-white'
}
</script>

<template>
  <section class="trader-panel p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-xs text-text-muted uppercase tracking-wider">{{ $t('common.label.status') }}</div>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-lg font-semibold">{{ statusLabel(currentStatus) }}</span>
          <span class="text-xs px-2 py-0.5 rounded-sm font-medium" :class="badgeClass(currentStatus)">
            {{ currentStatus }}
          </span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs text-text-muted uppercase tracking-wider">{{ $t('trader.kyc.tierTitle') }}</div>
        <div class="text-lg font-semibold">{{ t(KYC_TIER_LIMITS[currentTier].labelKey) }}</div>
      </div>
    </div>

    <div v-if="currentStatus === 'pending'" class="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-4 py-3">
      {{ $t('trader.kyc.statusPending') }}
    </div>

    <div v-if="currentStatus === 'approved'" class="text-sm text-success bg-success/10 border border-success/30 rounded-md px-4 py-3">
      {{ t('trader.kyc.statusApproved', { tier: t(KYC_TIER_LIMITS[currentTier].labelKey) }) }}
    </div>

    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <div>
        <div class="text-xs text-text-muted">{{ $t('common.label.name') }}</div>
        <div>{{ displayName ?? '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted">{{ $t('common.label.idNumber') }}</div>
        <div class="font-mono num">{{ record.idNumber }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted">{{ $t('common.label.birthDate') }}</div>
        <div>{{ record.birthDate }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted">{{ $t('common.label.phone') }}</div>
        <div>{{ record.phone }}</div>
      </div>
      <div class="col-span-2">
        <div class="text-xs text-text-muted">{{ $t('common.label.address') }}</div>
        <div>{{ record.address }}</div>
      </div>
      <div class="col-span-2">
        <div class="text-xs text-text-muted">{{ $t('common.label.submitTime') }}</div>
        <div class="num">{{ record.submittedAt.replace('T', ' ').slice(0, 16) }}</div>
      </div>
    </div>
  </section>

  <!-- Tier upgrade options -->
  <section v-if="currentStatus === 'approved' && currentTier === 'tier1'" class="trader-panel p-6">
    <h2 class="text-lg font-semibold mb-3">{{ $t('trader.kyc.upgradeTitle') }}</h2>
    <div class="space-y-3">
      <div class="border border-border rounded-md p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold">{{ t(KYC_TIER_LIMITS.tier2.labelKey) }}</div>
            <div class="text-sm text-text-muted mt-1">{{ t(KYC_TIER_LIMITS.tier2.copyKey) }}</div>
            <div class="text-xs text-text-muted mt-2">{{ t('trader.kyc.tier2RequirementsTitle', { requirements: t(KYC_TIER_LIMITS.tier2.requirementsKey) }) }}</div>
            <div class="mt-3">
              <KycFileSlot
                v-model="slotProof"
                layout="inline"
                :label="$t('trader.kyc.fileProof')"
                accept="image/*,application/pdf"
              />
            </div>
          </div>
          <BaseButton
            variant="primary"
            class="shrink-0"
            :disabled="!slotProof.uploaded || loading"
            @click="emit('upgrade', 'tier2')"
          >
            {{ t('trader.kyc.tierUpgradeCta', { tier: 'Tier 2' }) }}
          </BaseButton>
        </div>
      </div>

      <div class="border border-border rounded-md p-4 opacity-60">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold">{{ t(KYC_TIER_LIMITS.tier3.labelKey) }}</div>
            <div class="text-sm text-text-muted mt-1">{{ t(KYC_TIER_LIMITS.tier3.copyKey) }}</div>
            <div class="text-xs text-text-muted mt-2">{{ t('trader.kyc.tier3RequirementsTitle', { requirements: t(KYC_TIER_LIMITS.tier3.requirementsKey) }) }}</div>
          </div>
          <BaseButton
            variant="secondary"
            class="shrink-0"
            disabled
          >
            {{ $t('trader.kyc.tier2NotOpenedYet') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>
