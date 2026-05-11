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
      <table class="w-full text-sm num min-w-[420px]">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-3 py-2">{{ $t('admin.users.detail.thAsset') }}</th>
            <th class="text-right px-3 py-2">{{ $t('admin.users.detail.thAmount') }}</th>
            <th class="text-right px-3 py-2">{{ $t('admin.users.detail.thCost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in data.holdings" :key="h.symbol" class="border-b border-border last:border-0">
            <td class="px-3 py-2">{{ h.icon }} {{ h.symbol }}</td>
            <td class="px-3 py-2 text-right">{{ h.amount }}</td>
            <td class="px-3 py-2 text-right text-text-muted">{{ h.avgCost.toLocaleString('en-US') }}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <div v-else class="text-sm text-text-muted">{{ $t('admin.users.detail.noHoldings') }}</div>
    </section>

    <!-- Recent orders -->
    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.users.detail.recentOrders') }}</h2>
      <div v-if="data.recentOrders.length > 0" class="overflow-x-auto -mx-6 px-6">
      <table class="w-full text-sm num min-w-[640px]">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-3 py-2">{{ $t('common.label.time') }}</th>
            <th class="text-left px-3 py-2">{{ $t('common.label.symbol') }}</th>
            <th class="text-left px-3 py-2">{{ $t('common.label.side') }}</th>
            <th class="text-left px-3 py-2">{{ $t('trader.orders.th.type') }}</th>
            <th class="text-right px-3 py-2">{{ $t('common.label.quantity') }}</th>
            <th class="text-left px-3 py-2">{{ $t('common.label.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in data.recentOrders" :key="o.id" class="border-b border-border last:border-0">
            <td class="px-3 py-2 text-text-muted">{{ fmtDt(o.createdAt) }}</td>
            <td class="px-3 py-2">{{ o.symbol }}</td>
            <td class="px-3 py-2">{{ o.side }}</td>
            <td class="px-3 py-2 text-xs">{{ o.type }}</td>
            <td class="px-3 py-2 text-right">{{ o.quantity }}</td>
            <td class="px-3 py-2 text-xs">{{ o.status }}</td>
          </tr>
        </tbody>
      </table>
      </div>
      <div v-else class="text-sm text-text-muted">{{ $t('admin.users.detail.noOrders') }}</div>
    </section>
  </div>
</template>
