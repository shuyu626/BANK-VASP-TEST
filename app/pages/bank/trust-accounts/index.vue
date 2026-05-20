<script setup lang="ts">
import type { TrustAccount } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.trustAccounts') }))

interface Item {
  account: TrustAccount
  user: { id: string; displayName: string; email: string; kycTier: string; riskLevel: string; isFrozen: boolean }
  monthInflow: number
  monthOutflow: number
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/trust-accounts')

const trustAccountItems = computed(() => data.value?.items ?? [])

const trustAccountColumns = computed(() => [
  { key: 'user', label: t('bank.trustAccounts.th.user') },
  { key: 'vAccount', label: t('bank.trustAccounts.th.vAccount') },
  { key: 'balance', label: t('bank.trustAccounts.th.balance'), align: 'right' as const },
  { key: 'monthIn', label: t('bank.trustAccounts.th.monthIn'), align: 'right' as const },
  { key: 'monthOut', label: t('bank.trustAccounts.th.monthOut'), align: 'right' as const },
  { key: 'risk', label: t('bank.trustAccounts.th.risk') },
  { key: 'status', label: t('common.label.status') },
  { key: 'action', label: '', align: 'right' as const }
])
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.trustAccounts.title')" :subtitle="$t('bank.trustAccounts.subtitle')">
      <template #actions>
        <NuxtLink to="/bank" class="text-sm text-text-muted hover:text-text">{{ $t('bank.trustAccounts.back') }}</NuxtLink>
      </template>
    </BasePageHeader>

    <BaseTable
      :columns="trustAccountColumns"
      :items="trustAccountItems"
      :row-key="(row) => row.account.id"
      paginated
      :default-page-size="10"
      :empty-text="$t('bank.trustAccounts.empty')"
      :error-message="errorMessage"
      panel-class="bank-panel"
      table-class="bank-table"
      table-min-width="720px"
      @retry="refresh()"
    >
      <template #cell-user="{ row }">
        <div>
          <div class="font-medium">{{ row.user.displayName }}</div>
          <div class="text-xs text-text-muted">{{ row.user.email }}</div>
        </div>
      </template>
      <template #cell-vAccount="{ row }">
        <span class="font-mono num text-xs">{{ row.account.virtualAccountNumber }}</span>
      </template>
      <template #cell-balance="{ row }">
        <span class="num font-medium">{{ fmtTwd(row.account.balance) }}</span>
      </template>
      <template #cell-monthIn="{ row }">
        <span class="num text-text-muted">{{ fmtTwd(row.monthInflow) }}</span>
      </template>
      <template #cell-monthOut="{ row }">
        <span class="num text-text-muted">{{ fmtTwd(row.monthOutflow) }}</span>
      </template>
      <template #cell-risk="{ row }">
        <BaseBadge :variant="riskVariant(row.user.riskLevel)">{{ row.user.riskLevel }}</BaseBadge>
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.user.isFrozen" class="text-xs text-danger font-semibold">{{ $t('admin.users.frozenYes') }}</span>
        <span v-else class="text-xs text-text-muted">{{ $t('admin.users.frozenNo') }}</span>
      </template>
      <template #cell-action="{ row }">
        <NuxtLink :to="`/bank/trust-accounts/${row.account.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
      </template>
    </BaseTable>
  </div>
</template>
