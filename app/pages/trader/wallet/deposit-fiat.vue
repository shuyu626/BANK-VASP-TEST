<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWalletStore } from '~/stores/wallet'
import { useSessionStore } from '~/stores/session'
import { KYC_TIER_LIMITS, formatTwd } from '~~/shared/types/kyc-limits'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.depositFiat') }))

const wallet = useWalletStore()
const session = useSessionStore()
const { trustAccount, pendingDeposits, loading } = storeToRefs(wallet)
const { kycTier } = storeToRefs(session)

await wallet.loadSnapshot()

const amount = ref<number | null>(null)
const note = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const tierLimit = computed(() => KYC_TIER_LIMITS[kycTier.value].dailyDepositTwd)

// Daily usage computed from visible pending + completed (best effort; server is source of truth)
const dailyUsed = ref(0)
const dailyRemaining = ref(tierLimit.value)

async function loadLimits() {
  try {
    const res = await $fetch<{ dailyLimit: number; dailyUsed: number; dailyRemaining: number }>(
      '/api/trader/fiat/deposits',
      { headers: ssrCookieHeaders() }
    )
    dailyUsed.value = res.dailyUsed
    dailyRemaining.value = res.dailyRemaining
  } catch {
    // ignore — limits will show defaults
  }
}
await loadLimits()

const canSubmit = computed(() =>
  amount.value !== null && amount.value > 0 && amount.value <= dailyRemaining.value && !submitting.value
)

async function copyAccount() {
  if (!trustAccount.value) return
  try {
    await navigator.clipboard.writeText(trustAccount.value.virtualAccountNumber.replace(/\s/g, ''))
    successMsg.value = t('trader.wallet.depositFiat.copySuccess')
    setTimeout(() => { successMsg.value = null }, 2000)
  } catch {
    formError.value = t('trader.wallet.depositFiat.copyError')
  }
}

async function onSubmit() {
  if (!canSubmit.value || amount.value === null) return
  submitting.value = true
  formError.value = null
  successMsg.value = null
  try {
    const result = await wallet.submitFiatDeposit({ amount: amount.value, note: note.value || null })
    successMsg.value = t('trader.wallet.depositFiat.successMsg', { seconds: SETTLEMENT_DELAY_SEC, remaining: fmtTwd(result.remaining) })
    amount.value = null
    note.value = ''
    startPolling()
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: { remaining?: number } }
    if (e.statusMessage === 'LIMIT_EXCEEDED') {
      formError.value = t('trader.wallet.depositFiat.errorLimitExceeded', { remaining: fmtTwd(e.data?.remaining ?? 0) })
    } else {
      formError.value = e.statusMessage ?? t('common.status.error')
    }
  } finally {
    submitting.value = false
  }
}

// Light polling while any pending
const SETTLEMENT_DELAY_SEC = 3
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

onMounted(() => {
  if (wallet.hasPendingActivity) polling.start()
})

</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <BasePageHeader :title="$t('trader.wallet.depositFiat.title')" :subtitle="$t('trader.wallet.depositFiat.subtitle')" weight="bold">
      <template #actions>
        <NuxtLink to="/trader/wallet" class="text-sm text-text-muted hover:text-text">{{ $t('trader.wallet.depositFiat.back') }}</NuxtLink>
      </template>
    </BasePageHeader>

    <section v-if="loading && !trustAccount" class="trader-panel p-8 text-sm text-text-muted">{{ $t('common.status.loading') }}</section>

    <section v-else-if="!trustAccount" class="trader-panel p-6">
      <div class="text-sm">
        <div class="text-danger font-semibold mb-1">{{ $t('trader.wallet.depositFiat.noTrustTitle') }}</div>
        <div class="text-text-muted">{{ $t('trader.wallet.depositFiat.noTrustHint') }}</div>
        <NuxtLink to="/trader/kyc" class="inline-block mt-4 trader-cta">{{ $t('trader.wallet.kycGate.action') }}</NuxtLink>
      </div>
    </section>

    <template v-else>
      <section class="trader-panel p-6">
        <div class="text-xs uppercase tracking-wider text-text-muted mb-3">{{ $t('trader.wallet.depositFiat.instructionsTitle') }}</div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-text-muted text-xs mb-1">{{ $t('trader.wallet.depositFiat.bankName') }}</dt>
            <dd>{{ $t('trader.wallet.depositFiat.bankNameValue') }}</dd>
          </div>
          <div>
            <dt class="text-text-muted text-xs mb-1">{{ $t('trader.wallet.depositFiat.accountName') }}</dt>
            <dd>{{ session.user?.displayName ?? '—' }}{{ $t('trader.wallet.depositFiat.accountNameSuffix') }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-text-muted text-xs mb-1">{{ $t('trader.wallet.depositFiat.virtualAccount') }}</dt>
            <dd class="flex items-center gap-3">
              <span class="font-mono num text-lg">{{ trustAccount.virtualAccountNumber }}</span>
              <BaseButton variant="secondary" size="sm" @click="copyAccount">
                {{ $t('common.action.copy') }}
              </BaseButton>
            </dd>
          </div>
        </dl>
        <p class="text-xs text-text-muted mt-4 leading-relaxed">
          {{ $t('trader.wallet.depositFiat.footnote') }}
        </p>
      </section>

      <section class="trader-panel p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ $t('trader.wallet.depositFiat.simulationTitle') }}</h2>
          <div class="text-xs text-text-muted">
            {{ $t('trader.wallet.depositFiat.remainingLabel') }}<span class="num text-text">{{ formatTwd(dailyRemaining) }}</span>
            <span class="mx-1">/</span>
            {{ $t('trader.wallet.depositFiat.limitLabel') }} <span class="num">{{ formatTwd(tierLimit) }}</span>
          </div>
        </div>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <BaseInput
            v-model="amount"
            type="number"
            :min="1"
            :max="dailyRemaining"
            :label="$t('trader.wallet.depositFiat.amountLabel')"
            :placeholder="$t('trader.wallet.depositFiat.amountPlaceholder')"
            input-class="num"
          />
          <BaseInput
            v-model="note"
            :maxlength="100"
            :label="$t('trader.wallet.depositFiat.noteLabel')"
          />

          <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>
          <p v-if="successMsg" class="text-sm text-success">{{ successMsg }}</p>

          <BaseButton
            type="submit"
            variant="primary"
            block
            :disabled="!canSubmit"
            :loading="submitting"
          >
            {{ submitting ? $t('trader.wallet.depositFiat.submitting') : $t('trader.wallet.depositFiat.submitCta') }}
          </BaseButton>
          <p class="text-xs text-text-muted">
            {{ t('trader.wallet.depositFiat.demoFooter', { seconds: SETTLEMENT_DELAY_SEC }) }}
          </p>
        </form>
      </section>

      <section>
        <h2 class="text-lg font-semibold mb-3">{{ $t('trader.wallet.depositFiat.recentTitle') }}</h2>
        <div class="trader-panel overflow-x-auto">
          <table v-if="pendingDeposits.length > 0" class="w-full text-sm min-w-[480px]">
            <thead>
              <tr class="text-xs text-text-muted border-b border-border">
                <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.time') }}</th>
                <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.amount') }}</th>
                <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
                <th class="text-left px-4 py-3 font-medium">{{ $t('trader.wallet.depositFiat.tableRef') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in pendingDeposits"
                :key="d.id"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-3 num text-text-muted">{{ fmtDt(d.submittedAt) }}</td>
                <td class="px-4 py-3 text-right num">{{ fmtTwd(d.amount) }}</td>
                <td class="px-4 py-3">
                  <BaseBadge :variant="transferStatusVariant(d.status)" size="sm" :solid="false">
                    {{ d.status }}
                  </BaseBadge>
                </td>
                <td class="px-4 py-3 text-xs font-mono text-text-muted">{{ d.bankReference }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="p-8 text-center text-sm text-text-muted">{{ $t('trader.wallet.depositFiat.empty') }}</div>
        </div>
      </section>
    </template>
  </div>
</template>
