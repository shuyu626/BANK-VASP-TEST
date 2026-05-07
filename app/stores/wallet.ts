import { defineStore } from 'pinia'
import type {
  TrustAccount, BankAccount,
  FiatDeposit, FiatWithdrawal, CryptoWithdrawal,
  CryptoAddressBookEntry,
  FiatDepositInput, FiatWithdrawInput, CryptoWithdrawInput, AddAddressBookInput,
  AddBankAccountInput
} from '~~/shared/types'
import { extractErrorMessage } from '~/composables/useApiResource'
import { useNotificationsStore } from './notifications'
import type { CryptoHolding } from '~~/app/utils/mock/users'

interface Snapshot {
  trustAccount: TrustAccount | null
  bankAccounts: BankAccount[]
  holdings: CryptoHolding[]
  pendingDeposits: FiatDeposit[]
  pendingWithdrawals: FiatWithdrawal[]
  pendingCryptoWithdrawals: CryptoWithdrawal[]
  addressBook: CryptoAddressBookEntry[]
}

export const useWalletStore = defineStore('wallet', () => {
  const trustAccount = ref<TrustAccount | null>(null)
  const bankAccounts = ref<BankAccount[]>([])
  const holdings = ref<CryptoHolding[]>([])
  const pendingDeposits = ref<FiatDeposit[]>([])
  const pendingWithdrawals = ref<FiatWithdrawal[]>([])
  const pendingCryptoWithdrawals = ref<CryptoWithdrawal[]>([])
  const addressBook = ref<CryptoAddressBookEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const frozenTwd = computed(() =>
    pendingWithdrawals.value.reduce((sum, w) => sum + w.amount + w.fee, 0)
  )
  const fiatAvailable = computed(() => {
    const balance = trustAccount.value?.balance ?? 0
    return Math.max(0, balance - frozenTwd.value)
  })
  const verifiedBankAccounts = computed(() => bankAccounts.value.filter(b => b.isVerified))
  const hasPendingActivity = computed(() =>
    pendingDeposits.value.length > 0 ||
    pendingWithdrawals.value.length > 0 ||
    pendingCryptoWithdrawals.value.length > 0
  )

  async function loadSnapshot() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<Snapshot>('/api/trader/wallet/snapshot', { headers: ssrCookieHeaders() })
      trustAccount.value = res.trustAccount
      bankAccounts.value = res.bankAccounts
      holdings.value = res.holdings
      pendingDeposits.value = res.pendingDeposits
      pendingWithdrawals.value = res.pendingWithdrawals
      pendingCryptoWithdrawals.value = res.pendingCryptoWithdrawals
      addressBook.value = res.addressBook
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    await loadSnapshot()
  }

  async function submitFiatDeposit(input: FiatDepositInput): Promise<{ depositId: string; remaining: number }> {
    const res = await $fetch<{ deposit: FiatDeposit; remaining: number }>(
      '/api/trader/fiat/deposits',
      { method: 'POST', body: input, headers: ssrCookieHeaders() }
    )
    pendingDeposits.value = [res.deposit, ...pendingDeposits.value]
    useNotificationsStore().push({
      type: 'fiat-deposit',
      level: 'info',
      titleKey: 'trader.notifications.fiatDepositSubmitted',
      body: `NT$ ${res.deposit.amount.toLocaleString('en-US')}`
    })
    return { depositId: res.deposit.id, remaining: res.remaining }
  }

  async function submitFiatWithdraw(input: FiatWithdrawInput): Promise<{ withdrawalId: string }> {
    const res = await $fetch<{ withdrawal: FiatWithdrawal }>(
      '/api/trader/fiat/withdrawals',
      { method: 'POST', body: input, headers: ssrCookieHeaders() }
    )
    pendingWithdrawals.value = [res.withdrawal, ...pendingWithdrawals.value]
    useNotificationsStore().push({
      type: 'fiat-withdraw',
      level: 'info',
      titleKey: 'trader.notifications.fiatWithdrawSubmitted',
      body: `NT$ ${res.withdrawal.amount.toLocaleString('en-US')}`
    })
    return { withdrawalId: res.withdrawal.id }
  }

  async function submitCryptoWithdraw(input: CryptoWithdrawInput): Promise<{ withdrawalId: string }> {
    const res = await $fetch<{ withdrawal: CryptoWithdrawal }>(
      '/api/trader/crypto/withdrawals',
      { method: 'POST', body: input, headers: ssrCookieHeaders() }
    )
    pendingCryptoWithdrawals.value = [res.withdrawal, ...pendingCryptoWithdrawals.value]
    useNotificationsStore().push({
      type: 'crypto-withdraw',
      level: 'info',
      titleKey: 'trader.notifications.cryptoWithdrawSubmitted',
      body: `${res.withdrawal.amount} ${res.withdrawal.asset} (${res.withdrawal.network})`
    })
    return { withdrawalId: res.withdrawal.id }
  }

  async function addAddress(input: AddAddressBookInput): Promise<CryptoAddressBookEntry> {
    const res = await $fetch<{ entry: CryptoAddressBookEntry }>(
      '/api/trader/crypto/address-book',
      { method: 'POST', body: input, headers: ssrCookieHeaders() }
    )
    addressBook.value = [res.entry, ...addressBook.value]
    return res.entry
  }

  async function addBankAccount(input: AddBankAccountInput): Promise<BankAccount> {
    const res = await $fetch<{ bankAccount: BankAccount }>(
      '/api/trader/bank-accounts',
      { method: 'POST', body: input, headers: ssrCookieHeaders() }
    )
    bankAccounts.value = [...bankAccounts.value, res.bankAccount]
    useNotificationsStore().push({
      type: 'bank-account',
      level: 'info',
      titleKey: 'trader.notifications.bankAccountSubmitted',
      body: `${res.bankAccount.bankCode} · ${res.bankAccount.accountNumber}`
    })
    return res.bankAccount
  }

  async function removeBankAccount(id: string): Promise<void> {
    await $fetch(`/api/trader/bank-accounts/${id}`, {
      method: 'DELETE', headers: ssrCookieHeaders()
    })
    bankAccounts.value = bankAccounts.value.filter(b => b.id !== id)
  }

  return {
    trustAccount, bankAccounts, holdings,
    pendingDeposits, pendingWithdrawals, pendingCryptoWithdrawals,
    addressBook, loading, error,
    frozenTwd, fiatAvailable, verifiedBankAccounts, hasPendingActivity,
    loadSnapshot, refresh,
    submitFiatDeposit, submitFiatWithdraw, submitCryptoWithdraw,
    addAddress, addBankAccount, removeBankAccount
  }
})
