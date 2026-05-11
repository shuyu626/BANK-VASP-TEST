<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWalletStore } from '~/stores/wallet'
import { TRANSFER_FEES, SETTLEMENT_DELAYS } from '~~/shared/types/transfer-fees'
import { checkBlacklist, type BlacklistMatch, type BlacklistEntry } from '~~/shared/utils/blacklist'
import type { CryptoWithdrawalListResponse } from '~~/shared/types/api-responses'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.withdrawCrypto') }))

const wallet = useWalletStore()
const { holdings, addressBook, pendingCryptoWithdrawals } = storeToRefs(wallet)

await wallet.loadSnapshot()

// ─── History ─────────────────────────────────────────────────────
const history = ref<CryptoWithdrawalListResponse['withdrawals']>([])
const historyError = ref<string | null>(null)
async function loadHistory() {
  try {
    const res = await $fetch<CryptoWithdrawalListResponse>('/api/trader/crypto/withdrawals', {
      headers: ssrCookieHeaders()
    })
    history.value = res.withdrawals
    historyError.value = null
  } catch (err: unknown) {
    historyError.value = extractErrorMessage(err)
  }
}
await loadHistory()

// ─── Asset / address selection ───────────────────────────────────
const availableAssets = computed(() => holdings.value.filter(h => h.amount > 0 && TRANSFER_FEES.cryptoWithdraw[h.symbol]))
const selectedAsset = ref<string>(availableAssets.value[0]?.symbol ?? '')
const selectedFeeConfig = computed(() => TRANSFER_FEES.cryptoWithdraw[selectedAsset.value] ?? null)
const network = computed(() => selectedFeeConfig.value?.network ?? '')
const currentHolding = computed(() => holdings.value.find(h => h.symbol === selectedAsset.value))

const addressesForAsset = computed(() =>
  addressBook.value.filter(e => e.asset === selectedAsset.value)
)
const selectedAddressId = ref<string>('')
watch(selectedAsset, () => {
  selectedAddressId.value = addressesForAsset.value[0]?.id ?? ''
})
watch(addressesForAsset, (list) => {
  if (!selectedAddressId.value || !list.find(e => e.id === selectedAddressId.value)) {
    selectedAddressId.value = list[0]?.id ?? ''
  }
}, { immediate: true })

const selectedAddress = computed(() =>
  addressBook.value.find(e => e.id === selectedAddressId.value)
)

// ─── Cooldown / blacklist ────────────────────────────────────────
const { remainingMs: cooldownRemainingMs, isCool } = useAddressCooldown(SETTLEMENT_DELAYS.newAddressCooldownMs)
const selectedAddressCooldownMs = computed(() =>
  selectedAddress.value ? cooldownRemainingMs(selectedAddress.value.addedAt) : 0
)

const blacklistEntries = ref<BlacklistEntry[]>([])
async function loadBlacklist() {
  try {
    const res = await $fetch<{ entries: BlacklistEntry[] }>('/api/blacklist/entries', {
      headers: ssrCookieHeaders()
    })
    blacklistEntries.value = res.entries
  } catch {}
}
await loadBlacklist()

const addressBlacklist = ref<BlacklistMatch>({ hit: false })
watch([selectedAddress, blacklistEntries], ([addr]) => {
  addressBlacklist.value = addr ? checkBlacklist(addr.address, blacklistEntries.value) : { hit: false }
}, { immediate: true })

// ─── Tail confirmation + amount ──────────────────────────────────
const tailConfirm = ref('')
const expectedTail = computed(() =>
  selectedAddress.value ? selectedAddress.value.address.slice(-4).toLowerCase() : ''
)
const tailMatched = computed(() =>
  tailConfirm.value.trim().toLowerCase() === expectedTail.value && expectedTail.value.length === 4
)

const amount = ref<number | null>(null)
const fee = computed(() => selectedFeeConfig.value?.fee ?? 0)
const netAmount = computed(() => Math.max(0, (amount.value ?? 0) - fee.value))

function setMax() {
  if (!currentHolding.value || !selectedFeeConfig.value) return
  amount.value = Math.max(0, currentHolding.value.amount - selectedFeeConfig.value.fee)
}

// ─── Two-stage confirm ──────────────────────────────────────────
const { stage, countdownSec, start: startCountdown, cancel: cancelCountdown, finish: finishStage, reset: resetStage } = useTwoStageConfirm({ countdownSec: 60 })
const acknowledgedRisk = ref(false)
const submitting = ref(false)
const formError = ref<string | null>(null)

const canPreviewSubmit = computed(() => {
  const cfg = selectedFeeConfig.value
  const holding = currentHolding.value
  return (
    cfg !== null &&
    holding !== undefined &&
    amount.value !== null &&
    amount.value >= cfg.minAmount &&
    amount.value + cfg.fee <= holding.amount &&
    selectedAddress.value !== undefined &&
    selectedAddressCooldownMs.value === 0 &&
    !addressBlacklist.value.hit &&
    stage.value === 'edit'
  )
})
const canFinalSubmit = computed(() =>
  stage.value === 'ready' &&
  tailMatched.value &&
  acknowledgedRisk.value &&
  !addressBlacklist.value.hit &&
  !submitting.value
)

watch(stage, (s) => {
  if (s !== 'ready') {
    tailConfirm.value = ''
    acknowledgedRisk.value = false
  }
})

const addressBookFormRef = ref<{ isDirty: () => boolean } | null>(null)

useUnsavedChanges({
  isDirty: () =>
    stage.value !== 'submitted' &&
    !submitting.value &&
    (
      (amount.value !== null && amount.value > 0) ||
      (addressBookFormRef.value?.isDirty() ?? false)
    )
})

async function onFinalSubmit() {
  if (!selectedAddress.value || amount.value === null) return
  submitting.value = true
  formError.value = null
  try {
    await wallet.submitCryptoWithdraw({
      asset: selectedAsset.value,
      network: network.value,
      addressBookEntryId: selectedAddress.value.id,
      amount: amount.value
    })
    finishStage()
    amount.value = null
    await loadHistory()
    startPolling()
    setTimeout(() => { resetStage() }, 2000)
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: { available?: number; min?: number; remainingMs?: number } }
    formError.value = humanize(e.statusMessage, e.data)
    resetStage()
  } finally {
    submitting.value = false
  }
}

function humanize(code: string | undefined, data: { available?: number; min?: number; remainingMs?: number } | undefined): string {
  switch (code) {
    case 'INSUFFICIENT_HOLDING': return `${t('trader.withdrawCrypto.errorInsufficient')} (${data?.available})`
    case 'BELOW_MIN_AMOUNT': return `${t('trader.wallet.withdrawFiat.errBelowMin', { min: data?.min ?? 0 })}`
    case 'ADDRESS_COOLDOWN': return t('trader.withdrawCrypto.cooldownLabel', { sec: Math.ceil((data?.remainingMs ?? 0) / 1000) })
    case 'UNSUPPORTED_ASSET': return t('trader.withdrawCrypto.errorDefault')
    default: return code ?? t('trader.withdrawCrypto.errorDefault')
  }
}

// ─── Polling ─────────────────────────────────────────────────────
let pollHandle: ReturnType<typeof setInterval> | null = null
function startPolling() {
  if (pollHandle) return
  pollHandle = setInterval(async () => {
    await wallet.refresh()
    await loadHistory()
    if (!wallet.hasPendingActivity && pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }, 1500)
}
onBeforeUnmount(() => { if (pollHandle) clearInterval(pollHandle) })
onMounted(() => { if (wallet.hasPendingActivity) startPolling() })

// ─── Helpers ─────────────────────────────────────────────────────
function truncateAddress(addr: string) {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}
function formatDt(iso: string | null) {
  return iso ? iso.slice(0, 19).replace('T', ' ') : '—'
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold mb-1">{{ $t('trader.withdrawCrypto.title') }}</h1>
        <p class="text-sm text-text-muted">{{ $t('trader.withdrawCrypto.subtitle') }}</p>
      </div>
      <NuxtLink to="/trader/wallet" class="text-sm text-text-muted hover:text-text shrink-0">{{ $t('trader.withdrawCrypto.back') }}</NuxtLink>
    </header>

    <section v-if="availableAssets.length === 0" class="trader-panel p-6 text-sm text-text-muted">
      {{ $t('trader.wallet.crypto.empty') }}
    </section>

    <template v-else>
      <!-- Network 永久損失警告：始終顯示在最上方 -->
      <div class="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-start gap-3">
        <Icon name="lucide:triangle-alert" class="shrink-0 mt-0.5" size="20" aria-hidden="true" />
        <div>
          <div class="font-semibold mb-1">{{ $t('trader.withdrawCrypto.networkWarnTitle') }}</div>
          <div class="text-xs leading-relaxed">{{ t('trader.withdrawCrypto.networkWarnHint', { network }) }}</div>
        </div>
      </div>

      <section class="trader-panel p-6">
        <h2 class="text-lg font-semibold mb-4">{{ $t('trader.withdrawCrypto.title') }}</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BaseSelect
            v-model="selectedAsset"
            :label="$t('trader.withdrawCrypto.assetLabel')"
            :options="availableAssets.map((h) => ({ value: h.symbol, label: `${h.icon} ${h.symbol} · ${h.amount}` }))"
          />
          <BaseInput
            :model-value="network"
            disabled
            :label="$t('trader.withdrawCrypto.networkLabel')"
          />
        </div>

        <div class="mt-4">
          <BaseSelect
            v-if="addressesForAsset.length > 0"
            v-model="selectedAddressId"
            :label="$t('trader.withdrawCrypto.addressLabel')"
            :options="addressesForAsset.map((e) => ({ value: e.id, label: `${e.label ? `${e.label} · ` : ''}${truncateAddress(e.address)}${isCool(e.addedAt) ? '' : ` (${t('trader.withdrawCrypto.cooldownInline', { sec: Math.ceil(cooldownRemainingMs(e.addedAt) / 1000) })})`}` }))"
          />
          <div v-else>
            <div class="text-xs text-text-muted mb-1">{{ $t('trader.withdrawCrypto.addressLabel') }}</div>
            <div class="text-sm text-text-muted">{{ $t('trader.withdrawCrypto.noAddresses') }}</div>
          </div>
        </div>

        <div v-if="selectedAddress && selectedAddressCooldownMs > 0" class="mt-2 text-xs text-warning">
          {{ t('trader.withdrawCrypto.cooldownLabel', { sec: Math.ceil(selectedAddressCooldownMs / 1000) }) }}
        </div>

        <!-- Blacklist 命中：紅色強警告，submit disabled -->
        <div v-if="selectedAddress && addressBlacklist.hit" class="mt-3 rounded-md border border-danger bg-danger/15 p-3 text-xs">
          <div class="font-semibold text-danger mb-1 flex items-center gap-1.5">
            <Icon name="lucide:ban" size="14" aria-hidden="true" />
            <span>{{ $t('trader.withdrawCrypto.blacklistTitle') }}</span>
          </div>
          <div class="text-danger">
            {{ addressBlacklist.reason }}
            <span v-if="addressBlacklist.source" class="text-text-muted">· {{ addressBlacklist.source }}</span>
          </div>
          <div class="text-text-muted mt-2 leading-relaxed">{{ $t('trader.withdrawCrypto.blacklistHint') }}</div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between mb-1">
            <span class="block text-xs text-text-muted">{{ $t('trader.withdrawCrypto.amountLabel') }}</span>
            <button
              type="button"
              class="text-primary-400 text-xs hover:text-primary-300"
              @click="setMax"
            >
              MAX
            </button>
          </div>
          <BaseInput
            v-model="amount"
            type="number"
            :min="selectedFeeConfig?.minAmount ?? 0"
            :max="currentHolding ? currentHolding.amount - fee : 0"
            :placeholder="$t('trader.withdrawCrypto.amountPlaceholder')"
            :step="0.0001"
            input-class="num"
          />
          <div class="text-xs text-text-muted mt-1 flex justify-between">
            <span>{{ t('trader.withdrawCrypto.feeHint', { fee, asset: selectedAsset }) }}</span>
            <span>{{ $t('trader.wallet.withdrawFiat.netAmount') }}: <span class="num">{{ netAmount }}</span> {{ selectedAsset }}</span>
          </div>
        </div>

        <p v-if="formError" class="text-sm text-danger mt-4">{{ formError }}</p>

        <!-- Stage controls -->
        <div class="mt-6">
          <BaseButton
            v-if="stage === 'edit'"
            variant="primary"
            block
            :disabled="!canPreviewSubmit"
            @click="startCountdown"
          >
            {{ $t('common.action.confirm') }} (60s)
          </BaseButton>

          <div v-else-if="stage === 'countdown'" class="space-y-3">
            <div class="text-center py-6 bg-surface-alt rounded-md border border-border">
              <div class="text-xs text-text-muted uppercase tracking-wider">{{ $t('common.status.processing') }}</div>
              <div class="text-4xl font-semibold num mt-2">{{ countdownSec }}s</div>
            </div>
            <BaseButton variant="secondary" block @click="cancelCountdown">
              {{ $t('common.action.cancel') }}
            </BaseButton>
          </div>

          <div v-else-if="stage === 'ready'" class="space-y-3">
            <!-- 完整地址確認區塊 -->
            <div v-if="selectedAddress" class="rounded-md border border-warning/40 bg-warning/5 p-4 space-y-3">
              <div class="text-xs uppercase tracking-wider text-warning font-semibold">{{ $t('trader.withdrawCrypto.confirmFullAddress') }}</div>
              <div class="font-mono text-xs break-all leading-relaxed bg-surface-alt p-3 rounded">
                {{ selectedAddress.address }}
              </div>
              <div class="text-xs text-text-muted">
                {{ t('trader.withdrawCrypto.confirmTransferDetail', { amount: netAmount, asset: selectedAsset, network }) }}
              </div>

              <BaseInput
                v-model="tailConfirm"
                :maxlength="4"
                :label="t('trader.withdrawCrypto.tailConfirmLabel', { tail: expectedTail.toUpperCase() })"
                :placeholder="$t('trader.withdrawCrypto.tailConfirmPlaceholder')"
                :error="tailConfirm.length > 0 && !tailMatched ? $t('trader.withdrawCrypto.tailMismatch') : undefined"
                :hint="tailMatched ? `✓ ${$t('trader.withdrawCrypto.tailMatched')}` : undefined"
                input-class="num font-mono text-center tracking-[0.5em] uppercase"
              />
            </div>

            <div class="rounded-md border border-danger/40 bg-danger/5 p-4 space-y-3">
              <div class="text-xs font-semibold text-danger uppercase tracking-wider">
                {{ $t('trader.withdrawCrypto.riskAck.title') }}
              </div>
              <ul class="space-y-1.5 text-xs text-text-muted leading-relaxed list-disc pl-5">
                <li>{{ $t('trader.withdrawCrypto.riskAck.items.irreversible') }}</li>
                <li>{{ $t('trader.withdrawCrypto.riskAck.items.wrongAddress') }}</li>
                <li>{{ t('trader.withdrawCrypto.riskAck.items.wrongNetwork', { network }) }}</li>
              </ul>
              <BaseCheckbox v-model="acknowledgedRisk">
                <span class="text-xs leading-relaxed">{{ $t('trader.withdrawCrypto.riskAck.checkboxLabel') }}</span>
              </BaseCheckbox>
            </div>

            <BaseButton
              variant="primary"
              block
              :disabled="!canFinalSubmit"
              :loading="submitting"
              @click="onFinalSubmit"
            >
              {{ submitting ? $t('trader.withdrawCrypto.submitting') : $t('trader.withdrawCrypto.submitCta') }}
            </BaseButton>
            <BaseButton
              variant="secondary"
              block
              :disabled="submitting"
              @click="resetStage"
            >
              {{ $t('common.action.back') }}
            </BaseButton>
          </div>

          <div v-else-if="stage === 'submitted'" class="text-center py-4 bg-success/10 text-success rounded-md border border-success/30">
            {{ $t('trader.withdrawCrypto.successMsg') }}
          </div>
        </div>
      </section>

      <TraderCryptoAddressBookForm
        ref="addressBookFormRef"
        :asset="selectedAsset"
        :network="network"
        :entries="addressesForAsset"
        :is-cool="isCool"
        :cooldown-remaining-ms="cooldownRemainingMs"
        :truncate-address="truncateAddress"
        :format-dt="(iso) => formatDt(iso)"
        @added="(id: string) => selectedAddressId = id"
      />

      <TraderCryptoWithdrawalsHistoryTable
        :history="history"
        :truncate-address="truncateAddress"
        :format-dt="formatDt"
      />
    </template>
  </div>
</template>
