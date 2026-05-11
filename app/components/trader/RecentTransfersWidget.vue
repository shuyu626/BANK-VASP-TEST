<script setup lang="ts">
export interface TransferItem {
  kind: 'deposit' | 'withdrawal' | 'crypto'
  id: string
  at: string
  amount: number
  status: string
  asset?: string
  label?: string
}

const props = defineProps<{
  transfers: TransferItem[]
  hasPendingActivity: boolean
}>()

const { t } = useI18n()
const open = ref(false)

const pendingCount = computed(() =>
  props.transfers.filter(t => t.status === 'pending' || t.status === 'approved').length
)

function labelFor(it: TransferItem): string {
  if (it.label) return it.label
  if (it.kind === 'deposit') return t('trader.wallet.transferLabel.fiatDeposit')
  if (it.kind === 'withdrawal') return t('trader.wallet.transferLabel.fiatWithdraw')
  return t('trader.wallet.transferLabel.cryptoWithdraw', { asset: it.asset ?? '' })
}
</script>

<template>
  <section v-if="transfers.length > 0" class="trader-panel">
    <button
      class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-alt transition"
      @click="open = !open"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-base font-semibold">{{ $t('trader.wallet.recentTransfers.title') }}</h2>
        <span v-if="hasPendingActivity" class="text-xs px-2 py-0.5 rounded-sm bg-warning/20 text-warning animate-pulse">
          {{ t('trader.wallet.recentTransfers.processing', { count: pendingCount }) }}
        </span>
      </div>
      <span class="text-text-muted text-sm">{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="border-t border-border">
      <ul>
        <li
          v-for="it in transfers"
          :key="`${it.kind}-${it.id}`"
          class="px-6 py-3 flex items-center justify-between text-sm border-b border-border last:border-0"
        >
          <div class="flex items-center gap-3">
            <BaseBadge :variant="transferStatusVariant(it.status)" size="sm" :solid="false">
              {{ it.status }}
            </BaseBadge>
            <span>{{ labelFor(it) }}</span>
            <span class="text-xs text-text-muted num">{{ fmtDt(it.at, 'minute') }}</span>
          </div>
          <span
            class="num font-medium"
            :class="it.amount < 0 ? 'text-text-muted' : 'text-text'"
          >
            {{ it.kind === 'crypto' ? it.amount.toString() : `NT$ ${Math.abs(it.amount).toLocaleString('en-US')}` }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
