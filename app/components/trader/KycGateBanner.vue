<script setup lang="ts">
import type { KycStatus } from '~~/shared/types'

defineProps<{
  kycStatus: KycStatus | null
}>()

const { t } = useI18n()
</script>

<template>
  <section class="bg-warning/10 border border-warning/40 rounded-md p-4 flex items-start justify-between gap-4">
    <div>
      <div class="text-sm font-semibold text-warning mb-1">{{ $t('trader.wallet.kycGate.title') }}</div>
      <div class="text-xs text-text-muted">
        {{ t('trader.wallet.kycGate.hint', { status: kycStatus ?? t('trader.wallet.kycGate.statusUnknown') }) }}
      </div>
    </div>
    <NuxtLink to="/trader/kyc" class="px-4 py-2 bg-warning text-white rounded-md text-sm hover:opacity-90 shrink-0">
      {{ $t('trader.wallet.kycGate.action') }}
    </NuxtLink>
  </section>
</template>
