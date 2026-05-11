<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import type { CryptoAddressBookEntry } from '~~/shared/types'

// 加密地址簿管理：新增 + 列表（含冷卻狀態）。
// 直接呼叫 wallet store；新增成功後 emit 回父頁面以選取新增的地址。
defineProps<{
  asset: string
  network: string
  entries: CryptoAddressBookEntry[]
  isCool: (addedAt: string) => boolean
  cooldownRemainingMs: (addedAt: string) => number
  truncateAddress: (addr: string) => string
  formatDt: (iso: string) => string
}>()

const emit = defineEmits<{
  added: [entryId: string]
}>()

const wallet = useWalletStore()
const { t } = useI18n()

const newAddress = ref('')
const newAddressLabel = ref('')
const adding = ref(false)
const error = ref<string | null>(null)

defineExpose({
  /** 父頁面 useUnsavedChanges 偵測表單是否髒 */
  isDirty: () => newAddress.value.trim().length > 0
})

async function onSubmit(asset: string, network: string) {
  if (!newAddress.value || !asset) return
  adding.value = true
  error.value = null
  try {
    const entry = await wallet.addAddress({
      asset,
      network,
      address: newAddress.value,
      label: newAddressLabel.value || null
    })
    newAddress.value = ''
    newAddressLabel.value = ''
    emit('added', entry.id)
  } catch (err: unknown) {
    error.value = extractErrorMessage(err)
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <section class="trader-panel p-6">
    <h2 class="text-lg font-semibold mb-4">{{ t('trader.withdrawCrypto.addressBookTitle') }}</h2>
    <form class="space-y-3" @submit.prevent="onSubmit(asset, network)">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="newAddress"
          :placeholder="t('trader.withdrawCrypto.addressInputLabel')"
          input-class="font-mono"
        />
        <BaseInput
          v-model="newAddressLabel"
          :maxlength="40"
          :placeholder="t('trader.withdrawCrypto.labelOptional')"
        />
      </div>
      <BaseButton
        type="submit"
        variant="primary"
        :disabled="!newAddress || adding"
        :loading="adding"
      >
        {{ adding ? t('common.action.processing') : `${t('trader.withdrawCrypto.saveAddress')} · ${asset} (${network})` }}
      </BaseButton>
      <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    </form>

    <div v-if="entries.length > 0" class="mt-4 space-y-2">
      <div v-for="e in entries" :key="e.id" class="flex items-center justify-between text-sm border-t border-border pt-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono num">{{ truncateAddress(e.address) }}</span>
            <span v-if="e.label" class="text-xs text-text-muted">· {{ e.label }}</span>
          </div>
          <div class="text-xs text-text-muted">{{ formatDt(e.addedAt) }}</div>
        </div>
        <span
          class="text-xs px-2 py-0.5 rounded-sm"
          :class="isCool(e.addedAt) ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'"
        >
          {{ isCool(e.addedAt) ? t('common.status.normal') : `${Math.ceil(cooldownRemainingMs(e.addedAt) / 1000)}s` }}
        </span>
      </div>
    </div>
  </section>
</template>
