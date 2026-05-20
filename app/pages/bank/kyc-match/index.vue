<script setup lang="ts">
import type { KycRecord, User, BankAccount } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.kycMatch') }))

interface Item {
  record: KycRecord
  user?: User
  bankAccounts: BankAccount[]
}

type Filter = 'pending' | 'matched' | 'all'
const filter = ref<Filter>('pending')

const tabOptions = computed<{ value: Filter; label: string }[]>(() => [
  { value: 'pending', label: t('bank.kycMatch.tab.pending') },
  { value: 'matched', label: t('bank.kycMatch.tab.matched') },
  { value: 'all', label: t('bank.kycMatch.tab.all') }
])

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/kyc-match', {
  query: computed(() => ({ status: filter.value }))
})
watch(filter, () => refresh())

const kycMatchItems = computed(() => data.value?.items ?? [])

const kycMatchColumns = computed(() => [
  { key: 'submittedAt', label: t('bank.kycMatch.th.submitTime') },
  { key: 'user', label: t('common.label.user') },
  { key: 'idNumber', label: t('common.label.idNumberShort') },
  { key: 'bankAccounts', label: t('bank.kycMatch.th.bound') },
  { key: 'kycStatus', label: t('bank.kycMatch.th.vaspReview') },
  { key: 'bankMatch', label: t('bank.kycMatch.th.bankMatch') },
  { key: 'action', label: '', align: 'right' as const }
])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.kycMatch.title')" :subtitle="$t('bank.kycMatch.subtitle')" />

    <BaseTabBar v-model="filter" :options="tabOptions" />

    <BaseTable
      :columns="kycMatchColumns"
      :items="kycMatchItems"
      :row-key="(row) => row.record.id"
      paginated
      :default-page-size="10"
      :empty-text="$t('bank.kycMatch.empty')"
      :error-message="errorMessage"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @retry="refresh()"
    >
      <template #cell-submittedAt="{ row }">
        <span class="num text-text-muted text-xs">{{ fmtDt(row.record.submittedAt) }}</span>
      </template>
      <template #cell-user="{ row }">
        <div>
          <div class="font-medium">{{ row.user?.displayName ?? '—' }}</div>
          <div class="text-xs text-text-muted">{{ row.user?.email }}</div>
        </div>
      </template>
      <template #cell-idNumber="{ row }">
        <span class="font-mono num text-xs">{{ row.record.idNumber }}</span>
      </template>
      <template #cell-bankAccounts="{ row }">
        <div class="text-xs">
          <div v-if="row.bankAccounts.length > 0">
            <div v-for="b in row.bankAccounts" :key="b.id">
              {{ b.bankCode }} {{ b.bankName }}
              <BaseBadge :variant="b.isVerified ? 'success' : 'warning'" class="ml-1">
                {{ b.isVerified ? $t('bank.kycMatch.verifiedYes') : $t('bank.kycMatch.verifiedNo') }}
              </BaseBadge>
            </div>
          </div>
          <span v-else class="text-text-muted">{{ $t('bank.kycMatch.noBankAccount') }}</span>
        </div>
      </template>
      <template #cell-kycStatus="{ row }">
        <BaseBadge :variant="kycVariant(row.record.status)">{{ row.record.status }}</BaseBadge>
      </template>
      <template #cell-bankMatch="{ row }">
        <BaseBadge :variant="row.record.bankVerifiedAt ? 'success' : 'warning'">
          {{ row.record.bankVerifiedAt ? $t('bank.kycMatch.matched') : $t('bank.kycMatch.matchPending') }}
        </BaseBadge>
      </template>
      <template #cell-action="{ row }">
        <NuxtLink :to="`/bank/kyc-match/${row.record.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
      </template>
    </BaseTable>
  </div>
</template>
