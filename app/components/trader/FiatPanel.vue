<script setup lang="ts">
import type { TrustAccount } from '~~/shared/types'

defineProps<{
  trustAccount: TrustAccount | null
  fiatBalance: number
  fiatAvailable: number
  frozenTwd: number
  isApproved: boolean
}>()

const { t } = useI18n()

function gatedTitle(actionKey: string, isApproved: boolean) {
  return isApproved ? undefined : t('trader.wallet.gatedTooltip', { action: t(`trader.wallet.gatedAction.${actionKey}`) })
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">{{ $t('trader.wallet.fiat.title') }}</h2>
      <NuxtLink to="/trader/wallet/bank-accounts" class="text-xs text-primary-400 hover:text-primary-300">
        {{ $t('trader.nav.bankAccounts') }} →
      </NuxtLink>
    </div>
    <div class="trader-panel p-6">
      <div v-if="trustAccount" class="flex items-center justify-between gap-6">
        <div>
          <div class="text-xs text-text-muted uppercase tracking-wider mb-1">{{ $t('trader.wallet.fiat.balanceLabel') }}</div>
          <div class="text-3xl font-semibold num">{{ fmtTwd(fiatBalance) }}</div>
          <div class="text-xs text-text-muted mt-2 space-x-3">
            <span>{{ $t('trader.wallet.fiat.virtualAccount') }}<span class="font-mono num">{{ trustAccount.virtualAccountNumber }}</span></span>
            <span>{{ $t('trader.wallet.fiat.trusteeName') }}</span>
            <span v-if="frozenTwd > 0" class="text-warning">{{ t('trader.wallet.fiat.available', { amount: fmtTwd(fiatAvailable) }) }}</span>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <BaseButton
            v-if="isApproved"
            variant="primary"
            to="/trader/wallet/deposit-fiat"
          >
            {{ $t('trader.wallet.fiat.depositCta') }}
          </BaseButton>
          <BaseButton v-else variant="primary" disabled>
            {{ $t('trader.wallet.fiat.depositCta') }}
          </BaseButton>

          <BaseButton
            v-if="isApproved"
            variant="secondary"
            to="/trader/wallet/withdraw-fiat"
          >
            {{ $t('trader.wallet.fiat.withdrawCta') }}
          </BaseButton>
          <BaseButton v-else variant="secondary" disabled>
            {{ $t('trader.wallet.fiat.withdrawCta') }}
          </BaseButton>
        </div>
      </div>
      <div v-else class="text-center py-8">
        <div class="text-3xl font-semibold num mb-1">NT$ 0</div>
        <p class="text-xs text-text-muted">{{ $t('trader.wallet.fiat.noTrust') }}</p>
      </div>
    </div>
  </section>
</template>
