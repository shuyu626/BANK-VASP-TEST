<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useKycStore } from '~/stores/kyc'
import { useSessionStore } from '~/stores/session'
import type { FileSlot } from '~/components/trader/KycFileSlot.vue'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.kyc') }))

const kyc = useKycStore()
const session = useSessionStore()
const { record, currentStatus, currentTier, loading, error: kycError } = storeToRefs(kyc)

await kyc.loadStatus()

const mode = computed<'form' | 'view'>(() => {
  if (!record.value) return 'form'
  if (currentStatus.value === 'rejected') return 'form'
  return 'view'
})

// ─── Form state ──────────────────────────────────────────────────

const fullName = ref('')
const idNumber = ref('')
const birthDate = ref('')
const phone = ref('')
const address = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)

// 「初次載入失敗」與「送出失敗」是兩種錯誤：前者全頁攔截可重試，後者 inline 顯示在表單下方
const initialLoadFailed = computed(() => kycError.value !== null && record.value === null && !submitting.value)

async function reloadKyc() {
  await kyc.loadStatus()
}

function makeSlot(): FileSlot {
  return { uploaded: null, previewDataUrl: null, error: null }
}

const slotIdFront = ref<FileSlot>(makeSlot())
const slotIdBack = ref<FileSlot>(makeSlot())
const slotSelfie = ref<FileSlot>(makeSlot())
const slotProof = ref<FileSlot>(makeSlot())

function resetForm() {
  fullName.value = ''
  idNumber.value = ''
  birthDate.value = ''
  phone.value = ''
  address.value = ''
  slotIdFront.value = makeSlot()
  slotIdBack.value = makeSlot()
  slotSelfie.value = makeSlot()
  slotProof.value = makeSlot()
  formError.value = null
}

const canSubmitForm = computed(() => {
  return (
    fullName.value.length > 0 &&
    idNumber.value.length >= 8 &&
    birthDate.value.length > 0 &&
    phone.value.length > 0 &&
    address.value.length > 0 &&
    slotIdFront.value.uploaded !== null &&
    slotIdBack.value.uploaded !== null &&
    slotSelfie.value.uploaded !== null &&
    !submitting.value
  )
})

const isFormDirty = computed(() => {
  if (mode.value === 'view') return false
  if (submitting.value) return false
  return (
    fullName.value.length > 0 ||
    idNumber.value.length > 0 ||
    birthDate.value.length > 0 ||
    phone.value.length > 0 ||
    address.value.length > 0 ||
    slotIdFront.value.uploaded !== null ||
    slotIdBack.value.uploaded !== null ||
    slotSelfie.value.uploaded !== null ||
    slotProof.value.uploaded !== null
  )
})

useUnsavedChanges({ isDirty: () => isFormDirty.value })

async function onSubmit() {
  if (!canSubmitForm.value) return
  submitting.value = true
  formError.value = null
  try {
    await kyc.submit({
      fullName: fullName.value,
      idNumber: idNumber.value,
      birthDate: birthDate.value,
      phone: phone.value,
      address: address.value,
      docIdFront: slotIdFront.value.uploaded!,
      docIdBack: slotIdBack.value.uploaded!,
      docSelfie: slotSelfie.value.uploaded!,
      docProofOfAddress: slotProof.value.uploaded
    })
    await session.init()
  } catch {
    formError.value = kyc.error ?? t('trader.kyc.submitFailed')
  } finally {
    submitting.value = false
  }
}

async function onUpgrade(tier: 'tier2' | 'tier3') {
  if (tier === 'tier3') return
  if (!slotProof.value.uploaded) {
    formError.value = t('trader.kyc.needProofForTier2')
    return
  }
  try {
    await kyc.upgradeTo(tier)
    await session.init()
  } catch {
    formError.value = kyc.error ?? t('trader.kyc.submitFailed')
  }
}

function fillDemo() {
  fullName.value = 'Demo User'
  idNumber.value = 'A123456789'
  birthDate.value = '1990-01-01'
  phone.value = '0912-345-678'
  address.value = 'Demo Address'
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <header>
      <h1 class="text-2xl font-bold mb-1">{{ $t('trader.kyc.title') }}</h1>
      <p class="text-sm text-text-muted">
        {{ $t('trader.kyc.subtitle') }}
      </p>
    </header>

    <BasePageError
      v-if="initialLoadFailed"
      :message="kycError ?? ''"
      @retry="reloadKyc"
    />

    <section v-else-if="loading" class="trader-panel p-8 text-sm text-text-muted">{{ $t('common.status.loading') }}</section>

    <!-- Status view -->
    <TraderKycStatusView
      v-else-if="mode === 'view' && record"
      v-model:slot-proof="slotProof"
      :record="record"
      :current-status="currentStatus"
      :current-tier="currentTier"
      :display-name="session.user?.displayName ?? null"
      :loading="loading"
      @upgrade="onUpgrade"
    />

    <!-- Submission form (no record, or rejected) -->
    <template v-else>
      <section v-if="record && currentStatus === 'rejected'" class="bg-danger/10 border border-danger/40 text-danger rounded-md p-4 text-sm">
        <div class="font-semibold mb-1">{{ $t('trader.kyc.statusRejected') }}</div>
        <div>{{ record.rejectReason ?? $t('trader.kyc.statusRejected') }}</div>
      </section>

      <form class="trader-panel p-6 space-y-5" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="col-span-2">
            <BaseInput v-model="fullName" :label="$t('trader.kyc.fullNameLabel')" />
          </div>
          <BaseInput v-model="idNumber" :maxlength="10" :label="$t('trader.kyc.idNumberLabel')" input-class="font-mono" />
          <BaseInput v-model="birthDate" type="date" :label="$t('trader.kyc.birthDateLabel')" />
          <BaseInput v-model="phone" :label="$t('trader.kyc.phoneLabel')" />
          <BaseInput v-model="address" :label="$t('trader.kyc.addressLabel')" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TraderKycFileSlot v-model="slotIdFront" :label="$t('trader.kyc.fileFront')" required />
          <TraderKycFileSlot v-model="slotIdBack" :label="$t('trader.kyc.fileBack')" required />
          <TraderKycFileSlot v-model="slotSelfie" :label="$t('trader.kyc.fileSelfie')" required />
          <TraderKycFileSlot
            v-model="slotProof"
            :label="$t('trader.kyc.fileProof')"
            :hint="$t('trader.kyc.fileProofHint')"
            accept="image/*,application/pdf"
          />
        </div>

        <TraderKycLegalCitation />

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <div class="flex gap-3">
          <BaseButton
            type="submit"
            variant="primary"
            class="flex-1"
            :disabled="!canSubmitForm"
            :loading="submitting"
          >
            {{ submitting ? $t('trader.kyc.submitting') : $t('trader.kyc.submitCta') }}
          </BaseButton>
          <BaseButton variant="secondary" size="sm" @click="fillDemo">
            {{ $t('trader.login.demoAccount') }}
          </BaseButton>
          <BaseButton
            v-if="record && currentStatus === 'rejected'"
            variant="secondary"
            size="sm"
            @click="resetForm"
          >
            {{ $t('common.action.reset') }}
          </BaseButton>
        </div>
      </form>
    </template>

    <TraderKycTierLimitsTable :current-tier="currentTier" />
  </div>
</template>
