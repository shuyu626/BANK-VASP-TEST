<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWalletStore } from '~/stores/wallet'
import { useSessionStore } from '~/stores/session'
import { KYC_TIER_LIMITS, formatTwd } from '~~/shared/types/kyc-limits'
import { TRANSFER_FEES } from '~~/shared/types/transfer-fees'
import type { FiatWithdrawalLimitsResponse } from '~~/shared/types/api-responses'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.withdrawFiat') }))

const wallet = useWalletStore()
const session = useSessionStore()
const { trustAccount, verifiedBankAccounts, pendingWithdrawals, frozenTwd, fiatAvailable } = storeToRefs(wallet)
const { kycTier } = storeToRefs(session)

await wallet.loadSnapshot()

const bankAccountId = ref<string>('')
const amount = ref<number | null>(null)
const submitting = ref(false)
const formError = ref<string | null>(null)
const confirming = ref(false)

const fee = TRANSFER_FEES.fiatWithdraw.fixedTwd
const minAmount = TRANSFER_FEES.fiatWithdraw.minAmount

// Fetch limits
const limits = ref<FiatWithdrawalLimitsResponse | null>(null)
const limitsError = ref<string | null>(null)
async function loadLimits() {
  try {
    limits.value = await $fetch<FiatWithdrawalLimitsResponse>('/api/trader/fiat/withdrawals', {
      headers: ssrCookieHeaders()
    })
    limitsError.value = null
  } catch (err: unknown) {
    limitsError.value = extractErrorMessage(err)
  }
}
await loadLimits()

if (verifiedBankAccounts.value.length > 0 && !bankAccountId.value) {
  bankAccountId.value = verifiedBankAccounts.value[0]!.id
}

const tier = computed(() => KYC_TIER_LIMITS[kycTier.value])

const netPayout = computed(() => (amount.value ?? 0) - fee)
const canPreview = computed(
  () => bankAccountId.value !== '' &&
        amount.value !== null &&
        amount.value >= minAmount &&
        netPayout.value > 0
)

useUnsavedChanges({
  isDirty: () => !submitting.value && amount.value !== null && amount.value > 0
})

async function onPreview() {
  if (!canPreview.value) return
  confirming.value = true
}

async function onConfirm() {
  if (amount.value === null) return
  submitting.value = true
  formError.value = null
  try {
    await wallet.submitFiatWithdraw({ bankAccountId: bankAccountId.value, amount: amount.value })
    amount.value = null
    confirming.value = false
    await loadLimits()
    startPolling()
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: { remaining?: number } }
    formError.value = humanize(e.statusMessage, e.data)
  } finally {
    submitting.value = false
  }
}

function humanize(code: string | undefined, data: { remaining?: number } | undefined): string {
  switch (code) {
    case 'INSUFFICIENT_BALANCE': return t('trader.wallet.withdrawFiat.errInsufficient')
    case 'DAILY_LIMIT_EXCEEDED': return t('trader.wallet.withdrawFiat.errDailyLimit', { remaining: fmtTwd(data?.remaining ?? 0) })
    case 'MONTHLY_LIMIT_EXCEEDED': return t('trader.wallet.withdrawFiat.errMonthlyLimit', { remaining: fmtTwd(data?.remaining ?? 0) })
    case 'BELOW_MIN_AMOUNT': return t('trader.wallet.withdrawFiat.errBelowMin', { min: minAmount })
    case 'BANK_ACCOUNT_UNVERIFIED': return t('trader.wallet.withdrawFiat.errBankUnverified')
    default: return code ?? t('trader.wallet.withdrawFiat.errDefault')
  }
}

const polling = usePolling(async () => {
  await wallet.refresh()
  await loadLimits()
}, {
  intervalMs: 1500,
  shouldContinue: () => wallet.hasPendingActivity
})
function startPolling() {
  polling.start()
}
onMounted(() => { if (wallet.hasPendingActivity) polling.start() })

const selectedBank = computed(() => verifiedBankAccounts.value.find(b => b.id === bankAccountId.value))

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: t('trader.wallet.withdrawFiat.statusLabel.pending'),
    approved: t('trader.wallet.withdrawFiat.statusLabel.approved'),
    completed: t('trader.wallet.withdrawFiat.statusLabel.completed'),
    rejected: t('trader.wallet.withdrawFiat.statusLabel.rejected'),
    failed: t('trader.wallet.withdrawFiat.statusLabel.failed')
  }
  return map[s] ?? s
}

const pendingWithdrawalColumns = computed(() => [
  { key: 'submittedAt', label: t('common.label.submittedAt') },
  { key: 'approvedAt', label: t('common.label.approveTime') },
  { key: 'completedAt', label: t('common.label.completeTime') },
  { key: 'amount', label: t('common.label.amount'), align: 'right' as const },
  { key: 'fee', label: t('common.label.fee'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') }
])
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <BasePageHeader :title="$t('trader.wallet.withdrawFiat.title')" :subtitle="$t('trader.wallet.withdrawFiat.subtitle')" weight="bold">
      <template #actions>
        <NuxtLink to="/trader/wallet" class="text-sm text-text-muted hover:text-text">{{ $t('trader.wallet.withdrawFiat.back') }}</NuxtLink>
      </template>
    </BasePageHeader>

    <section class="trader-panel p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      <div>
        <div class="text-xs text-text-muted">{{ $t('trader.wallet.withdrawFiat.available') }}</div>
        <div class="text-lg font-semibold num">{{ fmtTwd(fiatAvailable) }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted">{{ $t('trader.wallet.withdrawFiat.frozenLabel') }}</div>
        <div class="text-lg font-semibold num text-warning">{{ fmtTwd(frozenTwd) }}</div>
      </div>
      <div>
        <div class="text-xs text-text-muted">{{ $t('trader.wallet.withdrawFiat.todayRemaining') }}</div>
        <div class="text-lg font-semibold num">
          {{ limits ? formatTwd(limits.dailyRemaining) : '—' }}
        </div>
      </div>
    </section>

    <section v-if="!trustAccount || verifiedBankAccounts.length === 0" class="trader-panel p-6">
      <div class="text-danger text-sm font-semibold mb-2">
        {{ !trustAccount ? $t('trader.wallet.withdrawFiat.noTrust') : $t('trader.wallet.withdrawFiat.noBank') }}
      </div>
      <p class="text-sm text-text-muted mb-3">
        {{ !trustAccount ? $t('trader.wallet.withdrawFiat.noTrustHint') : $t('trader.wallet.withdrawFiat.noBankHint') }}
      </p>
      <BaseButton
        v-if="trustAccount"
        variant="secondary"
        size="sm"
        to="/trader/wallet/bank-accounts"
      >
        {{ $t('trader.nav.bankAccounts') }} →
      </BaseButton>
    </section>

    <section v-else class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-4">{{ $t('trader.wallet.withdrawFiat.applyTitle') }}</h2>
      <form class="space-y-4" @submit.prevent="onPreview">
        <BaseSelect
          v-model="bankAccountId"
          :label="$t('trader.wallet.withdrawFiat.bankAccountLabel')"
          :options="verifiedBankAccounts.map((b) => ({ value: b.id, label: `${b.bankCode} · ${b.bankName} · ${b.accountNumber}（${b.accountName}）` }))"
        />

        <BaseInput
          v-model="amount"
          type="number"
          :min="minAmount"
          :max="fiatAvailable - fee"
          :label="$t('trader.wallet.withdrawFiat.amountLabel')"
          :placeholder="t('trader.wallet.withdrawFiat.amountPlaceholderMin', { min: minAmount })"
          :hint="t('trader.wallet.withdrawFiat.feeHint', { fee: `NT$ ${fee}`, daily: tier.dailyWithdrawTwd === -1 ? $t('trader.wallet.withdrawFiat.customLimit') : formatTwd(tier.dailyWithdrawTwd), monthly: tier.monthlyWithdrawTwd === -1 ? $t('trader.wallet.withdrawFiat.customLimit') : formatTwd(tier.monthlyWithdrawTwd) })"
          input-class="num"
        />

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          block
          :disabled="!canPreview"
        >
          {{ $t('trader.wallet.withdrawFiat.previewCta') }}
        </BaseButton>
      </form>
    </section>

    <section v-if="pendingWithdrawals.length > 0 || (trustAccount && verifiedBankAccounts.length > 0)">
      <h2 class="text-lg font-semibold mb-3">{{ $t('trader.wallet.withdrawFiat.recordTitle') }}</h2>
      <div class="trader-panel overflow-x-auto">
        <BaseTable
          :columns="pendingWithdrawalColumns"
          :items="pendingWithdrawals"
          row-key="id"
          paginated
          :default-page-size="10"
          numeric
          :empty-text="$t('trader.wallet.withdrawFiat.empty')"
          panel-class="bg-transparent border-0 rounded-none"
        >
          <template #cell-submittedAt="{ row }">
            <span class="text-text-muted">{{ fmtDt(row.submittedAt) }}</span>
          </template>
          <template #cell-approvedAt="{ row }">
            <span class="text-text-muted">{{ fmtDt(row.approvedAt) }}</span>
          </template>
          <template #cell-completedAt="{ row }">
            <span class="text-text-muted">{{ fmtDt(row.completedAt) }}</span>
          </template>
          <template #cell-amount="{ row }">{{ fmtTwd(row.amount) }}</template>
          <template #cell-fee="{ row }">
            <span class="text-text-muted">NT$ {{ row.fee }}</span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :variant="transferStatusVariant(row.status)" size="sm" :solid="false">
              {{ statusLabel(row.status) }}
            </BaseBadge>
          </template>
        </BaseTable>
      </div>
    </section>

    <!-- Confirmation modal -->
    <div
      v-if="confirming && amount !== null && selectedBank"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-30 px-4"
      @click.self="confirming = false"
    >
      <div class="trader-panel p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold mb-4">{{ $t('trader.wallet.withdrawFiat.confirmTitle') }}</h3>
        <div class="mb-4 p-3 rounded bg-warning/10 border border-warning/40 text-xs text-warning">
          <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('trader.wallet.withdrawFiat.sameNameWarn') }}
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-text-muted">{{ $t('trader.wallet.withdrawFiat.outBank') }}</dt>
            <dd>{{ selectedBank.bankCode }} · {{ selectedBank.bankName }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-muted">{{ $t('trader.wallet.withdrawFiat.outAccount') }}</dt>
            <dd class="font-mono num">{{ selectedBank.accountNumber }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-muted">{{ $t('trader.wallet.withdrawFiat.outName') }}</dt>
            <dd>{{ selectedBank.accountName }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-muted">{{ $t('trader.wallet.withdrawFiat.outAmount') }}</dt>
            <dd class="num">NT$ {{ amount.toLocaleString('en-US') }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-muted">{{ $t('trader.wallet.withdrawFiat.outFee') }}</dt>
            <dd class="num">NT$ {{ fee }}</dd>
          </div>
          <div class="flex justify-between font-semibold border-t border-border pt-2 mt-2">
            <dt>{{ $t('trader.wallet.withdrawFiat.netAmount') }}</dt>
            <dd class="num text-primary-400">NT$ {{ netPayout.toLocaleString('en-US') }}</dd>
          </div>
        </dl>
        <p class="text-xs text-text-muted mt-4">
          {{ $t('trader.wallet.withdrawFiat.confirmFooter') }}
        </p>
        <p v-if="formError" class="text-sm text-danger mt-3">{{ formError }}</p>
        <div class="flex gap-2 mt-6">
          <BaseButton
            variant="secondary"
            block
            :disabled="submitting"
            @click="confirming = false"
          >
            {{ $t('common.action.cancel') }}
          </BaseButton>
          <BaseButton
            variant="primary"
            block
            :disabled="submitting"
            :loading="submitting"
            @click="onConfirm"
          >
            {{ submitting ? $t('common.action.submitting') : $t('trader.wallet.withdrawFiat.submitCta') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
