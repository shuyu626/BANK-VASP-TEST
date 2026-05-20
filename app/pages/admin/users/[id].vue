<script setup lang="ts">
import type { User, TrustAccount, BankAccount, Order, KycRecord, RiskLevel } from '~~/shared/types'
import type { CryptoHolding } from '~~/app/utils/mock/users'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { t } = useI18n()

interface Detail {
  user: User
  trustAccount: TrustAccount | null
  bankAccounts: BankAccount[]
  holdings: CryptoHolding[]
  recentOrders: Order[]
  kycRecord: KycRecord | null
}
const { data, refresh } = await useFetch<Detail>(() => `/api/admin/users/${id.value}`, {
  headers: ssrCookieHeaders()
})

useHead(() => ({ title: `${data.value?.user.displayName ?? id.value} — Admin` }))

const freezing = ref(false)
const newRisk = ref<RiskLevel>('low')
const riskNote = ref('')
const toast = useToast()

// Freeze/unfreeze modal
const freezeModalOpen = ref(false)
const freezeReason = ref('')
const freezeIdConfirm = ref('')
const MIN_REASON_LEN = 10

watch(() => data.value?.user.riskLevel, (r) => { if (r) newRisk.value = r }, { immediate: true })

function openFreezeModal() {
  freezeReason.value = ''
  freezeIdConfirm.value = ''
  freezeModalOpen.value = true
}

const idConfirmed = computed(() =>
  !!data.value && freezeIdConfirm.value.trim() === data.value.user.id
)
const canSubmitFreeze = computed(() =>
  freezeReason.value.trim().length >= MIN_REASON_LEN && idConfirmed.value
)

async function onConfirmFreeze() {
  if (!data.value || !canSubmitFreeze.value) return
  freezing.value = true
  try {
    await $fetch(`/api/admin/users/${id.value}/freeze`, {
      method: 'POST', body: { frozen: !data.value.user.isFrozen, reason: freezeReason.value.trim() }
    })
    await refresh()
    toast.success(data.value.user.isFrozen ? t('admin.users.detail.frozen') : t('admin.users.detail.unfrozen'))
    freezeModalOpen.value = false
  } catch {
    toast.error(t('admin.users.detail.operationFailed'))
  } finally {
    freezing.value = false
  }
}

async function onChangeRisk() {
  try {
    await $fetch(`/api/admin/users/${id.value}/risk`, {
      method: 'POST', body: { level: newRisk.value, note: riskNote.value || null }
    })
    await refresh()
    toast.success(t('admin.users.detail.riskUpdated', { level: newRisk.value }))
    riskNote.value = ''
  } catch {
    toast.error(t('admin.users.detail.riskFailed'))
  }
}

const holdingsColumns = computed(() => [
  { key: 'symbol', label: t('admin.users.detail.thAsset') },
  { key: 'amount', label: t('admin.users.detail.thAmount'), align: 'right' as const },
  { key: 'avgCost', label: t('admin.users.detail.thCost'), align: 'right' as const }
])

const recentOrderColumns = computed(() => [
  { key: 'createdAt', label: t('common.label.time') },
  { key: 'symbol', label: t('common.label.symbol') },
  { key: 'side', label: t('common.label.side') },
  { key: 'type', label: t('trader.orders.th.type') },
  { key: 'quantity', label: t('common.label.quantity'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') }
])
</script>

<template>
  <div v-if="data" class="space-y-6 max-w-5xl">
    <NuxtLink to="/admin/users" class="text-xs text-text-muted hover:text-text">{{ $t('admin.users.detail.back') }}</NuxtLink>
    <BasePageHeader
      :title="data.user.displayName"
      :subtitle="`${data.user.email} · ID: ${data.user.id}`"
    >
      <template #actions>
        <BaseButton
          variant="secondary"
          size="sm"
          :class="data.user.isFrozen ? '!border-success !text-success' : '!border-danger !text-danger'"
          :disabled="freezing"
          @click="openFreezeModal"
        >
          {{ data.user.isFrozen ? $t('admin.users.detail.unfreeze') : $t('admin.users.detail.freeze') }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <!-- Freeze/unfreeze confirm modal -->
    <BaseModal v-model="freezeModalOpen" :title="data.user.isFrozen ? $t('admin.users.detail.unfreezeModalTitle') : $t('admin.users.detail.freezeModalTitle')" width="md">
      <div class="mb-4 p-3 rounded bg-danger/10 border border-danger/40 text-xs text-danger">
        <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ data.user.isFrozen ? $t('admin.users.detail.unfreezeWarn') : $t('admin.users.detail.freezeWarn') }}
      </div>
      <div class="text-xs text-text-muted mb-3">
        {{ $t('admin.users.detail.targetUser') }}：<span class="font-semibold text-text">{{ data.user.displayName }}</span>
        <span class="font-mono ml-2">{{ data.user.id }}</span>
      </div>
      <BaseTextarea
        v-model="freezeReason"
        :rows="3"
        required
        :label="$t('admin.users.detail.reasonLabel')"
        :placeholder="$t('admin.users.detail.reasonPlaceholder')"
        :hint="t('admin.users.detail.reasonCount', { n: freezeReason.trim().length, min: MIN_REASON_LEN })"
      />

      <div class="mt-3">
        <BaseInput
          v-model="freezeIdConfirm"
          required
          :label="t('admin.users.detail.confirmIdLabel', { id: data.user.id })"
          :placeholder="data.user.id"
          :error="freezeIdConfirm.length > 0 && !idConfirmed ? $t('admin.users.detail.confirmIdMismatch') : undefined"
          input-class="font-mono"
        />
      </div>
      <template #footer="{ close }">
        <BaseButton variant="secondary" block :disabled="freezing" @click="close">
          {{ $t('common.action.cancel') }}
        </BaseButton>
        <BaseButton
          :variant="data.user.isFrozen ? 'primary' : 'danger'"
          block
          :class="data.user.isFrozen ? '!bg-success' : ''"
          :disabled="!canSubmitFreeze || freezing"
          :loading="freezing"
          @click="onConfirmFreeze"
        >
          {{ freezing ? $t('common.action.processing') : (data.user.isFrozen ? $t('admin.users.detail.unfreeze') : $t('admin.users.detail.freeze')) }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Basic info -->
    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.users.detail.basicInfo') }}</h2>
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.kycStatus') }}</dt><dd>{{ data.user.kycStatus }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.tier') }}</dt><dd>{{ data.user.kycTier }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.riskLevel') }}</dt><dd>{{ data.user.riskLevel }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.twoFa') }}</dt><dd>{{ data.user.twoFaEnabled ? $t('admin.users.detail.twoFaOn') : $t('admin.users.detail.twoFaOff') }}</dd></div>
        <div class="col-span-2 sm:col-span-4"><dt class="text-xs text-text-muted">{{ $t('common.label.createdAt') }}</dt><dd class="num">{{ fmtDt(data.user.createdAt) }}</dd></div>
      </dl>
    </section>

    <!-- Risk level adjust -->
    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.users.detail.riskAdjust') }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm items-end">
        <BaseSelect
          v-model="newRisk"
          :options="[
            { value: 'low', label: $t('riskLevel.low') },
            { value: 'medium', label: $t('riskLevel.medium') },
            { value: 'high', label: $t('riskLevel.high') },
            { value: 'critical', label: $t('riskLevel.critical') }
          ]"
        />
        <BaseInput v-model="riskNote" :placeholder="$t('admin.users.detail.riskNote')" />
        <BaseButton variant="primary" @click="onChangeRisk">{{ $t('admin.users.detail.riskApply') }}</BaseButton>
      </div>
    </section>

    <!-- Trust + holdings -->
    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.users.detail.assets') }}</h2>
      <div v-if="data.trustAccount" class="mb-4 text-sm">
        <div class="text-xs text-text-muted">{{ $t('admin.users.detail.trustBalance') }}</div>
        <div class="text-xl font-semibold num">{{ fmtTwd(data.trustAccount.balance) }}</div>
        <div class="text-xs text-text-muted font-mono">{{ data.trustAccount.virtualAccountNumber }}</div>
      </div>
      <div v-else class="text-sm text-text-muted mb-4">{{ $t('admin.users.detail.noTrust') }}</div>

      <div v-if="data.holdings.length > 0" class="overflow-x-auto -mx-6 px-6">
        <BaseTable
          :columns="holdingsColumns"
          :items="data.holdings"
          row-key="symbol"
          paginated
          :default-page-size="10"
          numeric
          panel-class="bg-transparent border-0 rounded-none"
          table-class="text-sm"
          table-min-width="420px"
        >
          <template #cell-symbol="{ row }">{{ row.icon }} {{ row.symbol }}</template>
          <template #cell-avgCost="{ row }">
            <span class="text-text-muted">{{ row.avgCost.toLocaleString('en-US') }}</span>
          </template>
        </BaseTable>
      </div>
      <div v-else class="text-sm text-text-muted">{{ $t('admin.users.detail.noHoldings') }}</div>
    </section>

    <!-- Recent orders -->
    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.users.detail.recentOrders') }}</h2>
      <div v-if="data.recentOrders.length > 0" class="overflow-x-auto -mx-6 px-6">
        <BaseTable
          :columns="recentOrderColumns"
          :items="data.recentOrders"
          row-key="id"
          paginated
          :default-page-size="10"
          numeric
          panel-class="bg-transparent border-0 rounded-none"
          table-class="text-sm"
          table-min-width="640px"
        >
          <template #cell-createdAt="{ row }">
            <span class="text-text-muted">{{ fmtDt(row.createdAt) }}</span>
          </template>
          <template #cell-type="{ row }">
            <span class="text-xs">{{ row.type }}</span>
          </template>
          <template #cell-status="{ row }">
            <span class="text-xs">{{ row.status }}</span>
          </template>
        </BaseTable>
      </div>
      <div v-else class="text-sm text-text-muted">{{ $t('admin.users.detail.noOrders') }}</div>
    </section>
  </div>
</template>
