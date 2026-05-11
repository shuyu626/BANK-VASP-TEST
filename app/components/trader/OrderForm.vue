<script setup lang="ts">
import type { OrderSide, OrderType } from '~~/shared/types'

const props = defineProps<{
  symbol: string
  midPrice: number
  fiatAvailable: number
  baseHolding: number
  kycApproved: boolean
  quote: 'TWD' | string
  base: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { side: OrderSide; type: OrderType; price: number | null; quantity: number }): void
  (e: 'autofill', payload: { price: number; side: OrderSide }): void
}>()

const side = ref<OrderSide>('buy')
const type = ref<OrderType>('limit')
const price = ref<number | null>(null)
const quantity = ref<number | null>(null)
const submitting = ref(false)
const errorMsg = ref<string | null>(null)
const confirming = ref(false)
const lastPctApplied = ref<number | null>(null)

const { t } = useI18n()

watch(() => props.midPrice, (mp) => {
  if (price.value === null && mp) price.value = Math.round(mp * 100) / 100
})

const notional = computed(() => {
  if (quantity.value === null) return 0
  if (type.value === 'market') return (props.midPrice || 0) * quantity.value
  return (price.value ?? 0) * quantity.value
})

const fee = computed(() => notional.value * 0.001)
const totalCost = computed(() => side.value === 'buy' ? notional.value + fee.value : notional.value - fee.value)

// 大額閾值：與 CTR 門檻一致 NT$ 500,000；以 TWD 計價的對才適用
const LARGE_AMOUNT_TWD = 500_000
const isLargeAmount = computed(() => props.quote === 'TWD' && totalCost.value >= LARGE_AMOUNT_TWD)
const isMarket = computed(() => type.value === 'market')

const canSubmit = computed(() => {
  if (!props.kycApproved) return false
  if (submitting.value) return false
  if (quantity.value === null || quantity.value <= 0) return false
  if (type.value === 'limit' && (price.value === null || price.value <= 0)) return false
  if (side.value === 'buy' && props.quote === 'TWD') {
    return totalCost.value <= props.fiatAvailable
  }
  if (side.value === 'sell') {
    return quantity.value <= props.baseHolding
  }
  return true
})

let pctSetting = false
function pctSet(pct: number) {
  pctSetting = true
  if (side.value === 'buy') {
    const p = type.value === 'limit' ? (price.value ?? props.midPrice) : props.midPrice
    if (!p) { pctSetting = false; return }
    const budget = props.fiatAvailable * pct
    quantity.value = Math.round((budget / (p * 1.001)) * 10_000) / 10_000
  } else {
    quantity.value = Math.round(props.baseHolding * pct * 10_000) / 10_000
  }
  lastPctApplied.value = pct
  nextTick(() => { pctSetting = false })
}

// 使用者後續若手動改數量則清掉 100% 標記，避免警示誤導
watch(quantity, () => {
  if (pctSetting) return
  if (lastPctApplied.value !== null) lastPctApplied.value = null
})

const isMaxAllIn = computed(() => lastPctApplied.value === 1)

function onPreview() {
  if (!canSubmit.value) return
  errorMsg.value = null
  confirming.value = true
}

async function onConfirm() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = null
  try {
    emit('submit', {
      side: side.value,
      type: type.value,
      price: type.value === 'limit' ? price.value : null,
      quantity: quantity.value as number
    })
    quantity.value = null
    confirming.value = false
  } catch (err: unknown) {
    errorMsg.value = extract(err)
  } finally {
    submitting.value = false
  }
}

defineExpose({
  fillPrice(p: number, s: OrderSide) {
    side.value = s
    price.value = p
    if (type.value === 'market') type.value = 'limit'
  }
})

function extract(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? t('components.orderForm.submitFailed')
  }
  return t('components.orderForm.submitFailed')
}

const sideAction = computed(() =>
  side.value === 'buy' ? t('components.orderForm.buyAction', { base: props.base }) : t('components.orderForm.sellAction', { base: props.base })
)
</script>

<template>
  <div class="trader-panel p-4">
    <!-- Side tabs -->
    <div class="grid grid-cols-2 gap-1 mb-4 bg-surface-alt rounded-md p-1">
      <button
        type="button"
        class="py-2 rounded text-sm font-medium transition"
        :class="side === 'buy' ? 'bg-market-down text-white' : 'text-text-muted hover:text-text'"
        @click="side = 'buy'"
      >
        {{ t('components.orderForm.buyAction', { base }) }}
      </button>
      <button
        type="button"
        class="py-2 rounded text-sm font-medium transition"
        :class="side === 'sell' ? 'bg-market-up text-white' : 'text-text-muted hover:text-text'"
        @click="side = 'sell'"
      >
        {{ t('components.orderForm.sellAction', { base }) }}
      </button>
    </div>

    <!-- Type tabs -->
    <div class="grid grid-cols-2 gap-1 mb-4 text-xs">
      <button
        type="button"
        class="py-1.5 rounded border"
        :class="type === 'limit' ? 'border-primary-500 text-primary-400' : 'border-border text-text-muted'"
        @click="type = 'limit'"
      >
        {{ $t('components.orderForm.limit') }}
      </button>
      <button
        type="button"
        class="py-1.5 rounded border"
        :class="type === 'market' ? 'border-primary-500 text-primary-400' : 'border-border text-text-muted'"
        @click="type = 'market'"
      >
        {{ $t('components.orderForm.market') }}
      </button>
    </div>

    <form class="space-y-3" @submit.prevent="onPreview">
      <BaseInput
        v-if="type === 'limit'"
        v-model="price"
        type="number"
        :step="0.01"
        :label="t('components.orderForm.priceLabel', { quote })"
        :hint="t('components.orderForm.midPriceHint', { price: midPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) })"
        input-class="num"
      />

      <div>
        <BaseInput
          v-model="quantity"
          type="number"
          :step="0.0001"
          :label="t('components.orderForm.qtyLabel', { base })"
          input-class="num"
        />
        <div class="grid grid-cols-4 gap-1 mt-2">
          <BaseButton
            v-for="p in [0.25, 0.5, 0.75, 1]"
            :key="p"
            variant="secondary"
            size="sm"
            class="!text-[10px] !py-1 !px-1"
            @click="pctSet(p)"
          >
            {{ p * 100 }}%
          </BaseButton>
        </div>
        <p v-if="isMaxAllIn" class="text-[11px] text-warning mt-2">
          <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ side === 'buy' ? $t('components.orderForm.maxBuyHint') : $t('components.orderForm.maxSellHint') }}
        </p>
      </div>

      <div class="text-xs text-text-muted space-y-1 border-t border-border pt-3">
        <div class="flex justify-between">
          <span>{{ $t('components.orderForm.available') }}</span>
          <span class="num">
            {{ side === 'buy'
              ? `${quote === 'TWD' ? 'NT$ ' : ''}${props.fiatAvailable.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
              : `${props.baseHolding} ${base}` }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>{{ $t('components.orderForm.notional') }}</span>
          <span class="num">{{ notional.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ $t('components.orderForm.feeLabel') }}</span>
          <span class="num">{{ fee.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</span>
        </div>
        <div class="flex justify-between font-semibold text-text">
          <span>{{ side === 'buy' ? $t('components.orderForm.deductLabel') : $t('components.orderForm.creditLabel') }}</span>
          <span class="num">{{ totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</span>
        </div>
      </div>

      <p v-if="errorMsg" class="text-xs text-danger">{{ errorMsg }}</p>
      <p v-if="!kycApproved" class="text-xs text-warning">{{ $t('components.orderForm.kycRequired') }}</p>

      <button
        type="submit"
        :disabled="!canSubmit"
        class="w-full py-2 rounded text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        :class="side === 'buy' ? 'bg-market-down hover:brightness-110' : 'bg-market-up hover:brightness-110'"
      >
        {{ sideAction }}
      </button>
    </form>

    <!-- Confirm modal -->
    <BaseModal v-model="confirming" :title="t('components.orderForm.confirmTitle')" width="md">
      <!-- Risk warnings -->
      <div v-if="isLargeAmount" class="mb-4 p-3 rounded bg-danger/10 border border-danger/40 text-xs text-danger">
        <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('components.orderForm.largeAmountWarn') }}
      </div>
      <div v-if="isMarket" class="mb-4 p-3 rounded bg-warning/10 border border-warning/40 text-xs text-warning">
        <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('components.orderForm.marketSlippageWarn') }}
      </div>
      <div v-if="isMaxAllIn" class="mb-4 p-3 rounded bg-warning/10 border border-warning/40 text-xs text-warning">
        <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ side === 'buy' ? $t('components.orderForm.maxBuyHint') : $t('components.orderForm.maxSellHint') }}
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('common.label.symbol') }}</dt>
          <dd class="font-semibold">{{ symbol }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('common.label.side') }}</dt>
          <dd class="font-semibold" :class="side === 'buy' ? 'text-market-down' : 'text-market-up'">
            {{ sideAction }}
          </dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('trader.orders.th.type') }}</dt>
          <dd>{{ isMarket ? $t('components.orderForm.market') : $t('components.orderForm.limit') }}</dd>
        </div>
        <div v-if="!isMarket" class="flex justify-between">
          <dt class="text-text-muted">{{ $t('common.label.price') }}</dt>
          <dd class="num">{{ (price ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</dd>
        </div>
        <div v-else class="flex justify-between">
          <dt class="text-text-muted">{{ $t('components.orderForm.estimatedPrice') }}</dt>
          <dd class="num text-warning">~{{ midPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('common.label.quantity') }}</dt>
          <dd class="num">{{ (quantity ?? 0) }} {{ base }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('components.orderForm.feeLabel') }}</dt>
          <dd class="num">{{ fee.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</dd>
        </div>
        <div class="flex justify-between font-semibold border-t border-border pt-2 mt-2">
          <dt>{{ side === 'buy' ? $t('components.orderForm.deductLabel') : $t('components.orderForm.creditLabel') }}</dt>
          <dd class="num">{{ totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 }) }} {{ quote }}</dd>
        </div>
      </dl>

      <template #footer="{ close }">
        <BaseButton variant="secondary" class="flex-1" :disabled="submitting" @click="close">
          {{ $t('common.action.cancel') }}
        </BaseButton>
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-transparent text-sm text-white font-medium transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="side === 'buy' ? 'bg-market-down' : 'bg-market-up'"
          :disabled="submitting"
          @click="onConfirm"
        >
          {{ submitting ? $t('common.action.submitting') : $t('components.orderForm.confirmCta') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
