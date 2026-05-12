<script setup lang="ts">
import type { TrustAccount, User } from '~~/shared/types'

definePageMeta({ layout: 'bank' })

interface Movement {
  kind: 'in' | 'out'
  id: string
  at: string
  amount: number
  status: string
  ref: string | null
}

interface Detail {
  account: TrustAccount
  user: User
  movements: Movement[]
}

const route = useRoute()
const id = computed(() => String(route.params.id))
const { t } = useI18n()

const { data, errorMessage, refresh } = await useBankResource<Detail>(() => `/api/bank/trust-accounts/${id.value}`)

useHead(() => ({ title: t('bank.head.trustAccountDetail', { id: id.value }) }))
</script>

<template>
  <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
  <div v-else-if="data" class="space-y-6">
    <NuxtLink to="/bank/trust-accounts" class="text-xs text-text-muted hover:text-text">{{ $t('bank.trustAccounts.detail.back') }}</NuxtLink>
    <BasePageHeader
      :title="t('bank.trustAccounts.detail.title', { id: data.account.id })"
      :subtitle="t('bank.trustAccounts.detail.subtitle', { name: data.user.displayName, email: data.user.email })"
    />

    <section class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.trustAccounts.detail.infoTitle') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-sm">
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('bank.trustAccounts.detail.vAccount') }}</dt>
          <dd class="font-mono num text-base">{{ data.account.virtualAccountNumber }}</dd>
        </div>
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('bank.trustAccounts.detail.balance') }}</dt>
          <dd class="num text-base font-semibold">{{ fmtTwd(data.account.balance) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('bank.trustAccounts.detail.openedAt') }}</dt>
          <dd class="num">{{ fmtDt(data.account.createdAt, 'date') }}</dd>
        </div>
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('bank.trustAccounts.detail.vasp') }}</dt>
          <dd class="font-mono">{{ data.account.vaspId }}</dd>
        </div>
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('bank.trustAccounts.detail.kycTier') }}</dt>
          <dd>{{ data.user.kycTier }}</dd>
        </div>
        <div>
          <dt class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('common.label.riskLevel') }}</dt>
          <dd>
            <BaseBadge :variant="riskVariant(data.user.riskLevel)">{{ data.user.riskLevel }}</BaseBadge>
          </dd>
        </div>
      </dl>
    </section>

    <section>
      <h2 class="bank-heading text-lg mb-3">{{ $t('bank.trustAccounts.detail.movements') }}</h2>
      <div class="bank-panel overflow-x-auto">
        <table class="bank-table">
          <thead>
            <tr>
              <th>{{ $t('bank.trustAccounts.detail.thAt') }}</th>
              <th>{{ $t('common.label.direction') }}</th>
              <th class="text-right">{{ $t('common.label.amount') }}</th>
              <th>{{ $t('common.label.status') }}</th>
              <th>{{ $t('bank.trustAccounts.detail.thRef') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="data.movements.length === 0">
              <td colspan="5" class="text-center text-text-muted py-8">{{ $t('bank.trustAccounts.detail.noMovements') }}</td>
            </tr>
            <tr v-for="m in data.movements" :key="`${m.kind}-${m.id}`">
              <td class="num text-text-muted text-xs">{{ fmtDt(m.at) }}</td>
              <td>
                <span :class="m.kind === 'in' ? 'text-success' : 'text-text-muted'">
                  {{ m.kind === 'in' ? $t('bank.trustAccounts.detail.kindIn') : $t('bank.trustAccounts.detail.kindOut') }}
                </span>
              </td>
              <td class="text-right num font-medium">{{ fmtTwd(m.amount) }}</td>
              <td>
                <BaseBadge :variant="fiatTxnVariant(m.status)">{{ m.status }}</BaseBadge>
              </td>
              <td class="font-mono text-xs text-text-muted">{{ m.ref ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
