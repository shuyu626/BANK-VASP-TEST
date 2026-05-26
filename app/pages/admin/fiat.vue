<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminReviewsStore } from '~/stores/admin-reviews'

definePageMeta({ layout: 'admin' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.fiat') }))

const reviews = useAdminReviewsStore()
const { deposits, withdrawals, loading, error } = storeToRefs(reviews)
const toast = useToast()

type Tab = 'withdrawals' | 'deposits'
const tab = ref<Tab>('withdrawals')
const statusFilter = ref('')

const tabOptions = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'withdrawals', label: t('admin.fiat.tabWithdraw') },
  { value: 'deposits', label: t('admin.fiat.tabDeposit') }
])

async function load() {
  if (tab.value === 'withdrawals') await reviews.loadWithdrawals(statusFilter.value || undefined)
  else await reviews.loadDeposits(statusFilter.value || undefined)
}
await load()
watch([tab, statusFilter], load)

const { paged: pagedWithdrawals, bindings: withdrawalsBindings } = usePagination({
  source: () => withdrawals.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
})
const { paged: pagedDeposits, bindings: depositsBindings } = usePagination({
  source: () => deposits.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
})

const rejectForId = ref<string | null>(null)
const rejectReason = ref('')
const holdForId = ref<string | null>(null)
const holdReason = ref('')

const rejectOpen = computed({
  get: () => rejectForId.value !== null,
  set: (v) => { if (!v) { rejectForId.value = null; rejectReason.value = '' } }
})
const holdOpen = computed({
  get: () => holdForId.value !== null,
  set: (v) => { if (!v) { holdForId.value = null; holdReason.value = '' } }
})

async function onReject() {
  if (!rejectForId.value || rejectReason.value.length === 0) return
  try {
    await reviews.rejectWithdrawal(rejectForId.value, { reason: rejectReason.value })
    await load()
    toast.success(t('admin.fiat.rejectSuccess'))
    rejectForId.value = null
    rejectReason.value = ''
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('admin.fiat.operationFailed'))
  }
}

async function onHold() {
  if (!holdForId.value) return
  try {
    await reviews.holdDeposit(holdForId.value, { reason: holdReason.value || null })
    await load()
    toast.success(t('admin.fiat.holdSuccess'))
    holdForId.value = null
    holdReason.value = ''
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('admin.fiat.operationFailed'))
  }
}

async function onRelease(id: string) {
  try {
    await reviews.releaseDeposit(id)
    await load()
    toast.success(t('admin.fiat.releaseSuccess'))
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('admin.fiat.operationFailed'))
  }
}
</script>

<template>
  <div class="space-y-4">
    <BasePageHeader :title="$t('admin.fiat.title')" :subtitle="$t('admin.fiat.subtitle')" />

    <BaseTabs
      v-model="tab"
      :options="tabOptions"
      :aria-label="$t('admin.fiat.title')"
    >
      <template #trailing>
        <div class="w-44">
          <BaseSelect
            v-model="statusFilter"
            :options="[
              { value: '', label: $t('admin.fiat.filterAll') },
              { value: 'pending', label: $t('fiatStatus.pending') },
              { value: 'reviewing', label: $t('fiatStatus.reviewing') },
              { value: 'approved', label: $t('fiatStatus.approved') },
              { value: 'completed', label: $t('fiatStatus.completed') },
              { value: 'rejected', label: $t('fiatStatus.rejected') }
            ]"
          />
        </div>
      </template>

      <BaseTabPanel value="withdrawals">
        <BaseTable
          :colspan="6"
          :empty="withdrawals.length === 0"
          :loading="loading"
          :error-message="error"
          :empty-text="$t('admin.fiat.withdrawEmpty')"
          :skeleton-rows="5"
          numeric
          @retry="load()"
        >
          <template #head>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.submittedAt') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.amount') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.fee') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
            </tr>
          </template>
          <tr v-for="it in pagedWithdrawals" :key="it.withdrawal.id" class="border-b border-border last:border-0">
            <td class="px-4 py-3 text-text-muted">{{ fmtDt(it.withdrawal.submittedAt) }}</td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
              <div class="text-xs text-text-muted font-mono">{{ it.withdrawal.userId }}</div>
            </td>
            <td class="px-4 py-3 text-right">{{ fmtTwd(it.withdrawal.amount) }}</td>
            <td class="px-4 py-3 text-right text-text-muted">NT$ {{ it.withdrawal.fee }}</td>
            <td class="px-4 py-3">
              <BaseBadge :variant="fiatTxnVariant(it.withdrawal.status)">
                {{ it.withdrawal.status }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <BaseButton
                v-if="it.withdrawal.status === 'pending' || it.withdrawal.status === 'approved'"
                variant="secondary"
                size="sm"
                tone="danger"
                class="border-danger"
                @click="rejectForId = it.withdrawal.id"
              >
                {{ $t('admin.fiat.rejectCta') }}
              </BaseButton>
              <span v-else class="text-text-muted text-xs">—</span>
            </td>
          </tr>
          <template #footer>
            <BasePagination v-bind="withdrawalsBindings" show-first-button show-last-button />
          </template>
        </BaseTable>
      </BaseTabPanel>

      <BaseTabPanel value="deposits">
        <BaseTable
          :colspan="5"
          :empty="deposits.length === 0"
          :loading="loading"
          :error-message="error"
          :empty-text="$t('admin.fiat.depositEmpty')"
          :skeleton-rows="5"
          numeric
          @retry="load()"
        >
          <template #head>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.submittedAt') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.user') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.amount') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('common.label.status') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
            </tr>
          </template>
          <tr v-for="it in pagedDeposits" :key="it.deposit.id" class="border-b border-border last:border-0">
            <td class="px-4 py-3 text-text-muted">{{ fmtDt(it.deposit.submittedAt) }}</td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
              <div class="text-xs text-text-muted font-mono">{{ it.deposit.userId }}</div>
            </td>
            <td class="px-4 py-3 text-right">{{ fmtTwd(it.deposit.amount) }}</td>
            <td class="px-4 py-3">
              <BaseBadge :variant="fiatTxnVariant(it.deposit.status)">
                {{ it.deposit.status }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3 text-right space-x-1">
              <BaseButton
                v-if="it.deposit.status === 'pending'"
                variant="secondary"
                size="sm"
                class="!border-warning !text-warning"
                @click="holdForId = it.deposit.id"
              >
                {{ $t('admin.fiat.holdCta') }}
              </BaseButton>
              <BaseButton
                v-if="it.deposit.status === 'reviewing'"
                variant="secondary"
                size="sm"
                tone="success"
                class="border-success"
                @click="onRelease(it.deposit.id)"
              >
                {{ $t('admin.fiat.releaseCta') }}
              </BaseButton>
              <span v-if="it.deposit.status !== 'pending' && it.deposit.status !== 'reviewing'" class="text-text-muted text-xs">—</span>
            </td>
          </tr>
          <template #footer>
            <BasePagination v-bind="depositsBindings" show-first-button show-last-button />
          </template>
        </BaseTable>
      </BaseTabPanel>
    </BaseTabs>

    <BaseModal v-model="rejectOpen" :title="$t('admin.fiat.rejectModalTitle')">
      <BaseTextarea
        v-model="rejectReason"
        :rows="3"
        :label="$t('admin.fiat.rejectReasonLabel')"
      />
      <template #footer="{ close }">
        <BaseButton variant="secondary" block @click="close">{{ $t('common.action.cancel') }}</BaseButton>
        <BaseButton
          variant="danger"
          block
          :disabled="rejectReason.length === 0"
          @click="onReject"
        >
          {{ $t('admin.fiat.rejectConfirm') }}
        </BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="holdOpen" :title="$t('admin.fiat.holdModalTitle')">
      <p class="text-xs text-text-muted mb-3">{{ $t('admin.fiat.holdHint') }}</p>
      <BaseInput
        v-model="holdReason"
        :label="$t('admin.fiat.holdReasonLabel')"
      />
      <template #footer="{ close }">
        <BaseButton variant="secondary" block @click="close">{{ $t('common.action.cancel') }}</BaseButton>
        <BaseButton variant="primary" tone="warning" block @click="onHold">{{ $t('admin.fiat.holdConfirm') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
