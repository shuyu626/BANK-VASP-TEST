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

const movementColumns = computed(() => [
  { key: 'at', label: t('bank.trustAccounts.detail.thAt') },
  { key: 'kind', label: t('common.label.direction') },
  { key: 'amount', label: t('common.label.amount'), align: 'right' as const },
  { key: 'status', label: t('common.label.status') },
  { key: 'ref', label: t('bank.trustAccounts.detail.thRef') }
])
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
        <BaseTable
          :columns="movementColumns"
          :items="data.movements"
          :row-key="(row) => `${row.kind}-${row.id}`"
          paginated
          :default-page-size="10"
          numeric
          :empty-text="$t('bank.trustAccounts.detail.noMovements')"
          panel-class="bg-transparent border-0 rounded-none"
          table-class="bank-table"
          table-min-width="720px"
        >
          <template #cell-at="{ row }">
            <span class="text-text-muted text-xs">{{ fmtDt(row.at) }}</span>
          </template>
          <template #cell-kind="{ row }">
            <span :class="row.kind === 'in' ? 'text-success' : 'text-text-muted'">
              {{ row.kind === 'in' ? $t('bank.trustAccounts.detail.kindIn') : $t('bank.trustAccounts.detail.kindOut') }}
            </span>
          </template>
          <template #cell-amount="{ row }">
            <span class="font-medium">{{ fmtTwd(row.amount) }}</span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :variant="fiatTxnVariant(row.status)">{{ row.status }}</BaseBadge>
          </template>
          <template #cell-ref="{ row }">
            <span class="font-mono text-xs text-text-muted">{{ row.ref ?? '—' }}</span>
          </template>
        </BaseTable>
      </div>
    </section>
  </div>
</template>
