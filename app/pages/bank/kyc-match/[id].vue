<script setup lang="ts">
import type { KycRecord, User, BankAccount, TrustAccount } from '~~/shared/types'

definePageMeta({ layout: 'bank' })

interface Detail {
  record: KycRecord
  user?: User
  bankAccounts: BankAccount[]
  trustAccount?: TrustAccount
}

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const toast = useToast()
const { t } = useI18n()

const { data, errorMessage, refresh } = await useBankResource<Detail>(() => `/api/bank/kyc-match/${id.value}`)
useHead(() => ({ title: t('bank.head.kycMatchDetail', { id: id.value }) }))

const submitting = ref(false)
const note = ref('')

async function onVerify() {
  if (!data.value) return
  submitting.value = true
  try {
    await $fetch(`/api/bank/kyc-match/${id.value}/verify`, {
      method: 'POST',
      body: { note: note.value || null }
    })
    toast.success(t('bank.kycMatch.detail.verifySuccess'))
    await refresh()
    setTimeout(() => router.push('/bank/kyc-match'), 800)
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    const msg = {
      KYC_NOT_APPROVED_BY_EXCHANGE: t('bank.kycMatch.detail.errKycNotApproved'),
      ALREADY_VERIFIED: t('bank.kycMatch.detail.errAlreadyVerified')
    }[e.statusMessage ?? ''] ?? e.statusMessage ?? t('bank.kycMatch.detail.errDefault')
    toast.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
  <div v-else-if="data" class="space-y-6 max-w-4xl">
    <NuxtLink to="/bank/kyc-match" class="text-xs text-text-muted hover:text-text">{{ $t('bank.kycMatch.detail.back') }}</NuxtLink>
    <BasePageHeader :title="t('bank.kycMatch.detail.title', { id: data.record.id })" :subtitle="t('bank.kycMatch.detail.subtitle', { name: data.user?.displayName ?? data.record.userId })">
      <template #actions>
        <BaseBadge :variant="data.record.bankVerifiedAt ? 'success' : 'warning'" size="sm">
          {{ data.record.bankVerifiedAt ? $t('bank.kycMatch.matched') : $t('bank.kycMatch.matchPending') }}
        </BaseBadge>
      </template>
    </BasePageHeader>

    <section class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.kycMatch.detail.basic') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.name') }}</dt><dd>{{ data.user?.displayName }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.email') }}</dt><dd>{{ data.user?.email }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.idNumber') }}</dt><dd class="font-mono">{{ data.record.idNumber }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.birthDate') }}</dt><dd>{{ data.record.birthDate }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.phone') }}</dt><dd>{{ data.record.phone }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.address') }}</dt><dd>{{ data.record.address }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('bank.kycMatch.detail.vaspSubmit') }}</dt><dd class="num">{{ fmtDt(data.record.submittedAt) }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('bank.kycMatch.detail.vaspApprove') }}</dt><dd class="num">{{ fmtDt(data.record.reviewedAt) }}</dd></div>
      </dl>
    </section>

    <section class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.kycMatch.detail.boundBanks') }}</h2>
      <div v-if="data.bankAccounts.length === 0" class="text-sm text-text-muted">{{ $t('bank.kycMatch.detail.noBoundBanks') }}</div>
      <div v-else class="overflow-x-auto -mx-6 px-6">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('bank.kycMatch.detail.bank') }}</th>
            <th>{{ $t('bank.kycMatch.detail.accountNumber') }}</th>
            <th>{{ $t('bank.kycMatch.detail.accountName') }}</th>
            <th>{{ $t('bank.kycMatch.detail.verified') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in data.bankAccounts" :key="b.id">
            <td>{{ b.bankCode }} · {{ b.bankName }}</td>
            <td class="font-mono num">{{ b.accountNumber }}</td>
            <td>{{ b.accountName }}</td>
            <td>
              <BaseBadge :variant="b.isVerified ? 'success' : 'warning'">
                {{ b.isVerified ? $t('bank.kycMatch.verifiedYes') : $t('bank.kycMatch.verifiedNo') }}
              </BaseBadge>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <section v-if="data.trustAccount" class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.kycMatch.detail.trustOpened') }}</h2>
      <div class="text-sm">
        <div class="num font-mono text-base">{{ data.trustAccount.virtualAccountNumber }}</div>
        <div class="text-xs text-text-muted mt-1">{{ t('bank.kycMatch.detail.trustBalance', { amount: fmtTwd(data.trustAccount.balance), date: fmtDt(data.trustAccount.createdAt, 'date') }) }}</div>
      </div>
    </section>

    <section v-if="!data.record.bankVerifiedAt" class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.kycMatch.detail.actionTitle') }}</h2>
      <p class="text-xs text-text-muted mb-3">
        {{ $t('bank.kycMatch.detail.actionHint') }}
      </p>
      <div class="mb-3">
        <BaseInput
          v-model="note"
          :label="`${$t('common.label.note')}（${$t('common.label.optional')}）`"
        />
      </div>
      <BaseButton
        variant="primary"
        :disabled="submitting"
        :loading="submitting"
        @click="onVerify"
      >
        {{ submitting ? $t('common.action.processing') : $t('bank.kycMatch.detail.verifyCta') }}
      </BaseButton>
    </section>

    <section v-else class="bank-panel p-6 border-success/40">
      <h2 class="bank-heading text-lg mb-2 text-success">{{ $t('bank.kycMatch.detail.completed') }}</h2>
      <p class="text-sm text-text-muted">{{ t('bank.kycMatch.detail.completedAt', { at: fmtDt(data.record.bankVerifiedAt) }) }}</p>
    </section>
  </div>
</template>
