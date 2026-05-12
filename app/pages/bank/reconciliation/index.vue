<script setup lang="ts">
definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.reconciliation') }))

interface Item {
  date: string
  depositCount: number
  depositAmount: number
  withdrawCount: number
  withdrawAmount: number
  pendingCount: number
  failedCount: number
  netFlow: number
  hasDiff: boolean
}

const { data, errorMessage, refresh } = await useBankResource<{ items: Item[] }>('/api/bank/reconciliation')
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.reconciliation.title')" :subtitle="$t('bank.reconciliation.subtitle')" />

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('bank.reconciliation.th.date') }}</th>
            <th class="text-right">{{ $t('bank.reconciliation.th.depositCount') }}</th>
            <th class="text-right">{{ $t('bank.reconciliation.th.depositAmount') }}</th>
            <th class="text-right">{{ $t('bank.reconciliation.th.withdrawCount') }}</th>
            <th class="text-right">{{ $t('bank.reconciliation.th.withdrawAmount') }}</th>
            <th class="text-right">{{ $t('bank.reconciliation.th.netFlow') }}</th>
            <th>{{ $t('common.label.status') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="8" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="!data || data.items.length === 0">
            <td colspan="8" class="text-center text-text-muted py-10">{{ $t('bank.reconciliation.empty') }}</td>
          </tr>
          <tr v-for="it in data?.items ?? []" :key="it.date">
            <td class="num">{{ it.date }}</td>
            <td class="text-right num text-text-muted">{{ it.depositCount }}</td>
            <td class="text-right num">{{ fmtTwd(it.depositAmount) }}</td>
            <td class="text-right num text-text-muted">{{ it.withdrawCount }}</td>
            <td class="text-right num">{{ fmtTwd(it.withdrawAmount) }}</td>
            <td class="text-right num font-medium" :class="it.netFlow >= 0 ? 'text-success' : 'text-text-muted'">
              {{ it.netFlow >= 0 ? '+' : '' }}{{ fmtTwd(it.netFlow) }}
            </td>
            <td>
              <BaseBadge v-if="it.hasDiff" variant="warning">{{ $t('bank.reconciliation.needsFollow') }}</BaseBadge>
              <BaseBadge v-else variant="success">{{ $t('bank.reconciliation.settled') }}</BaseBadge>
              <span v-if="it.pendingCount > 0" class="ml-2 text-xs text-text-muted">{{ t('bank.reconciliation.pendingPrefix', { count: it.pendingCount }) }}</span>
              <span v-if="it.failedCount > 0" class="ml-1 text-xs text-danger">{{ t('bank.reconciliation.failedPrefix', { count: it.failedCount }) }}</span>
            </td>
            <td class="text-right">
              <NuxtLink :to="`/bank/reconciliation/${it.date}`" class="text-xs hover:underline">{{ $t('bank.reconciliation.viewDetail') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
