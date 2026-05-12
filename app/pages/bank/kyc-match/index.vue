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
</script>

<template>
  <div class="space-y-6">
    <BasePageHeader :title="$t('bank.kycMatch.title')" :subtitle="$t('bank.kycMatch.subtitle')" />

    <BaseTabBar v-model="filter" :options="tabOptions" />

    <div class="bank-panel overflow-x-auto">
      <table class="bank-table">
        <thead>
          <tr>
            <th>{{ $t('bank.kycMatch.th.submitTime') }}</th>
            <th>{{ $t('common.label.user') }}</th>
            <th>{{ $t('common.label.idNumberShort') }}</th>
            <th>{{ $t('bank.kycMatch.th.bound') }}</th>
            <th>{{ $t('bank.kycMatch.th.vaspReview') }}</th>
            <th>{{ $t('bank.kycMatch.th.bankMatch') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <BaseTableErrorRow v-if="errorMessage" :colspan="7" :message="errorMessage" @retry="refresh()" />
          <tr v-else-if="!data || data.items.length === 0">
            <td colspan="7" class="text-center text-text-muted py-10">{{ $t('bank.kycMatch.empty') }}</td>
          </tr>
          <tr v-for="it in data?.items ?? []" :key="it.record.id">
            <td class="num text-text-muted text-xs">{{ fmtDt(it.record.submittedAt) }}</td>
            <td>
              <div class="font-medium">{{ it.user?.displayName ?? '—' }}</div>
              <div class="text-xs text-text-muted">{{ it.user?.email }}</div>
            </td>
            <td class="font-mono num text-xs">{{ it.record.idNumber }}</td>
            <td class="text-xs">
              <div v-if="it.bankAccounts.length > 0">
                <div v-for="b in it.bankAccounts" :key="b.id">
                  {{ b.bankCode }} {{ b.bankName }}
                  <BaseBadge :variant="b.isVerified ? 'success' : 'warning'" class="ml-1">
                    {{ b.isVerified ? $t('bank.kycMatch.verifiedYes') : $t('bank.kycMatch.verifiedNo') }}
                  </BaseBadge>
                </div>
              </div>
              <span v-else class="text-text-muted">{{ $t('bank.kycMatch.noBankAccount') }}</span>
            </td>
            <td>
              <BaseBadge :variant="kycVariant(it.record.status)">{{ it.record.status }}</BaseBadge>
            </td>
            <td>
              <BaseBadge :variant="it.record.bankVerifiedAt ? 'success' : 'warning'">
                {{ it.record.bankVerifiedAt ? $t('bank.kycMatch.matched') : $t('bank.kycMatch.matchPending') }}
              </BaseBadge>
            </td>
            <td class="text-right">
              <NuxtLink :to="`/bank/kyc-match/${it.record.id}`" class="text-xs hover:underline">{{ $t('common.action.viewDetail') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
