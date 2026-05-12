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
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.trustAccounts.title')" :subtitle="$t('bank.trustAccounts.subtitle')">
      <template #actions>
        <NuxtLink to="/bank" class="text-sm text-text-muted hover:text-text">{{ $t('bank.trustAccounts.back') }}</NuxtLink>
      </template>
    </BasePageHeader>

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('bank.trustAccounts.th.user') }}</th>
            <th>{{ $t('bank.trustAccounts.th.vAccount') }}</th>
            <th class="text-right">{{ $t('bank.trustAccounts.th.balance') }}</th>
            <th class="text-right">{{ $t('bank.trustAccounts.th.monthIn') }}</th>
            <th class="text-right">{{ $t('bank.trustAccounts.th.monthOut') }}</th>
            <th>{{ $t('bank.trustAccounts.th.risk') }}</th>
            <th>{{ $t('common.label.status') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="8" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="!data || data.items.length === 0">
            <td colspan="8" class="text-center text-text-muted py-10">{{ $t('bank.trustAccounts.empty') }}</td>
          </tr>
          <tr v-for="it in data?.items ?? []" :key="it.account.id">
            <td>
              <div class="font-medium">{{ it.user.displayName }}</div>
              <div class="text-xs text-text-muted">{{ it.user.email }}</div>
            </td>
            <td class="font-mono num text-xs">{{ it.account.virtualAccountNumber }}</td>
            <td class="text-right num font-medium">{{ fmtTwd(it.account.balance) }}</td>
            <td class="text-right num text-text-muted">{{ fmtTwd(it.monthInflow) }}</td>
            <td class="text-right num text-text-muted">{{ fmtTwd(it.monthOutflow) }}</td>
            <td>
              <BaseBadge :variant="riskVariant(it.user.riskLevel)">{{ it.user.riskLevel }}</BaseBadge>
            </td>
            <td class="text-xs">
              <span v-if="it.user.isFrozen" class="text-danger font-semibold">{{ $t('admin.users.frozenYes') }}</span>
              <span v-else class="text-text-muted">{{ $t('admin.users.frozenNo') }}</span>
            </td>
            <td class="text-right">
              <NuxtLink :to="`/bank/trust-accounts/${it.account.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
