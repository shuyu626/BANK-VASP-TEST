<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWalletStore } from '~/stores/wallet'
import { useSessionStore } from '~/stores/session'
import { AddBankAccountInputSchema, type AddBankAccountInput } from '~~/shared/types'

definePageMeta({ layout: 'trader' })
const { t, te } = useI18n()
useHead(() => ({ title: t('trader.head.bankAccounts') }))

const wallet = useWalletStore()
const session = useSessionStore()
const { bankAccounts } = storeToRefs(wallet)
const { kycStatus, user } = storeToRefs(session)
const toast = useToast()
const { confirm } = useConfirm()

await wallet.loadSnapshot()

const isApproved = computed(() => kycStatus.value === 'approved')

// 常用銀行代碼從 i18n 取，避免 hard-code 在元件內
const BANK_CODES = ['004','005','006','700','805','808','812','822','013','017'] as const
const bankOptions = computed(() => BANK_CODES.map((c) => ({
  value: c,
  label: `${c} · ${t(`trader.wallet.bankAccounts.bankList.${c}`)}`
})))

const form = reactive<AddBankAccountInput>({
  bankCode: '805',
  bankName: t('trader.wallet.bankAccounts.bankList.805'),
  accountNumber: '',
  accountName: user.value?.displayName ?? ''
})

watch(() => form.bankCode, (code) => {
  const key = `trader.wallet.bankAccounts.bankList.${code}`
  if (te(key)) form.bankName = t(key)
})

const submitting = ref(false)
const formError = ref<string | null>(null)

const parsed = computed(() => AddBankAccountInputSchema.safeParse(form))
const canSubmit = computed(() => parsed.value.success && !submitting.value && isApproved.value)

function humanize(code: string | null | undefined): string {
  switch (code) {
    case 'VALIDATION_ERROR': return t('trader.wallet.bankAccounts.errValidation')
    case 'NAME_MISMATCH': return t('trader.wallet.bankAccounts.errNameMismatch')
    case 'DUPLICATE_BANK_ACCOUNT': return t('trader.wallet.bankAccounts.errDuplicate')
    case 'CANNOT_REMOVE_VERIFIED': return t('trader.wallet.bankAccounts.errCannotRemoveVerified')
    default: return code ?? t('trader.wallet.bankAccounts.errDefault')
  }
}

function extract(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? 'ERROR'
  }
  return 'ERROR'
}

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  formError.value = null
  try {
    await wallet.addBankAccount({ ...form })
    form.accountNumber = ''
    toast.success(t('trader.wallet.bankAccounts.addSuccess'))
  } catch (err: unknown) {
    formError.value = humanize(extract(err))
  } finally {
    submitting.value = false
  }
}

async function onRemove(id: string) {
  const ok = await confirm({
    message: t('trader.wallet.bankAccounts.removeConfirm'),
    variant: 'danger'
  })
  if (!ok) return
  try {
    await wallet.removeBankAccount(id)
    toast.success(t('trader.wallet.bankAccounts.removeSuccess'))
  } catch (err: unknown) {
    toast.error(humanize(extract(err)))
  }
}

useUnsavedChanges({
  isDirty: () => !submitting.value && form.accountNumber.length > 0
})

const { paged: pagedAccounts, bindings: accountBindings } = usePagination({
  source: () => bankAccounts.value,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <BasePageHeader
      :title="$t('trader.wallet.bankAccounts.title')"
      :subtitle="$t('trader.wallet.bankAccounts.subtitle')"
      weight="bold"
    >
      <template #actions>
        <NuxtLink to="/trader/wallet" class="text-sm text-text-muted hover:text-text">
          {{ $t('trader.wallet.withdrawFiat.back') }}
        </NuxtLink>
      </template>
    </BasePageHeader>

    <section v-if="!isApproved" class="trader-panel p-6">
      <p class="text-sm text-warning"><Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('trader.wallet.bankAccounts.kycRequired') }}</p>
      <NuxtLink to="/trader/kyc" class="inline-block mt-3 trader-cta">
        {{ $t('trader.wallet.kycGate.action') }}
      </NuxtLink>
    </section>

    <section class="trader-panel overflow-hidden">
      <div class="px-6 py-4 border-b border-border">
        <h2 class="text-base font-semibold">{{ $t('trader.wallet.bankAccounts.listTitle') }}</h2>
      </div>
      <BaseTable
        :colspan="5"
        :empty="bankAccounts.length === 0"
        :empty-text="$t('trader.wallet.bankAccounts.empty')"
        panel-class=""
      >
        <template #head>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left px-6 py-3 font-medium">{{ $t('trader.wallet.bankAccounts.thBank') }}</th>
            <th class="text-left px-6 py-3 font-medium">{{ $t('trader.wallet.bankAccounts.thAccount') }}</th>
            <th class="text-left px-6 py-3 font-medium">{{ $t('trader.wallet.bankAccounts.thAccountName') }}</th>
            <th class="text-left px-6 py-3 font-medium">{{ $t('trader.wallet.bankAccounts.thStatus') }}</th>
            <th class="text-right px-6 py-3 font-medium">{{ $t('trader.wallet.bankAccounts.thAction') }}</th>
          </tr>
        </template>
        <tr v-for="b in pagedAccounts" :key="b.id" class="border-b border-border last:border-0">
          <td class="px-6 py-3 text-sm">{{ b.bankCode }} · {{ b.bankName }}</td>
          <td class="px-6 py-3 text-sm font-mono num">{{ b.accountNumber }}</td>
          <td class="px-6 py-3 text-sm">{{ b.accountName }}</td>
          <td class="px-6 py-3">
            <BaseBadge :variant="b.isVerified ? 'success' : 'warning'" size="sm">
              {{ b.isVerified ? $t('trader.wallet.bankAccounts.statusVerified') : $t('trader.wallet.bankAccounts.statusPending') }}
            </BaseBadge>
          </td>
          <td class="px-6 py-3 text-right">
            <BaseButton
              v-if="!b.isVerified"
              variant="secondary"
              size="sm"
              class="!text-danger"
              @click="onRemove(b.id)"
            >
              {{ $t('trader.wallet.bankAccounts.removeCta') }}
            </BaseButton>
            <span v-else class="text-text-muted text-xs">—</span>
          </td>
        </tr>
        <template #footer>
          <BasePagination v-bind="accountBindings" show-first-button show-last-button />
        </template>
      </BaseTable>
    </section>

    <section v-if="isApproved" class="trader-panel p-6">
      <h2 class="text-base font-semibold mb-4">{{ $t('trader.wallet.bankAccounts.addTitle') }}</h2>
      <form class="space-y-4 max-w-lg" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-4">
          <BaseSelect
            v-model="form.bankCode"
            :label="$t('trader.wallet.bankAccounts.bankCodeLabel')"
            :options="bankOptions"
          />
          <BaseInput
            v-model="form.bankName"
            :label="$t('trader.wallet.bankAccounts.bankNameLabel')"
            disabled
          />
        </div>

        <BaseInput
          v-model="form.accountNumber"
          :label="$t('trader.wallet.bankAccounts.accountNumberLabel')"
          placeholder="012-345-6789"
          input-class="font-mono"
        />

        <BaseInput
          v-model="form.accountName"
          :label="$t('trader.wallet.bankAccounts.accountNameLabel')"
          :hint="$t('trader.wallet.bankAccounts.accountNameHint')"
        />

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!canSubmit"
          :loading="submitting"
        >
          {{ submitting ? $t('trader.wallet.bankAccounts.submitting') : $t('trader.wallet.bankAccounts.submitCta') }}
        </BaseButton>
      </form>
    </section>
  </div>
</template>
