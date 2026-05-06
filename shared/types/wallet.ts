import { z } from 'zod'
import { FiatTxStatusSchema } from './enums'

// ─── Entities ─────────────────────────────────────────────────────

export const BankAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bankCode: z.string(),         // 銀行代碼（例：805 東東商銀）
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  isVerified: z.boolean(),
  verifiedAt: z.string().nullable()
})
export type BankAccount = z.infer<typeof BankAccountSchema>

// VASP 在銀行開立的信託專戶（虛擬帳號分配給每位客戶）
export const TrustAccountSchema = z.object({
  id: z.string(),
  vaspId: z.string(),
  userId: z.string(),
  virtualAccountNumber: z.string(),  // 虛擬帳號（客戶匯款用）
  balance: z.number(),               // 新台幣餘額
  createdAt: z.string()
})
export type TrustAccount = z.infer<typeof TrustAccountSchema>

export const FiatDepositSchema = z.object({
  id: z.string(),
  userId: z.string(),
  trustAccountId: z.string(),
  amount: z.number(),
  status: FiatTxStatusSchema,
  bankReference: z.string(),         // 銀行交易序號
  submittedAt: z.string(),
  completedAt: z.string().nullable(),
  note: z.string().nullable()
})
export type FiatDeposit = z.infer<typeof FiatDepositSchema>

export const FiatWithdrawalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bankAccountId: z.string(),
  amount: z.number(),
  fee: z.number(),
  status: FiatTxStatusSchema,
  submittedAt: z.string(),
  approvedBy: z.string().nullable(),  // 後台審核員
  approvedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  rejectReason: z.string().nullable()
})
export type FiatWithdrawal = z.infer<typeof FiatWithdrawalSchema>

export const CryptoWithdrawalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  asset: z.string(),               // BTC / ETH / USDT
  network: z.string(),             // Bitcoin / Ethereum / TRC20
  toAddress: z.string(),
  amount: z.number(),
  fee: z.number(),
  status: FiatTxStatusSchema,
  txHash: z.string().nullable(),
  submittedAt: z.string(),
  completedAt: z.string().nullable()
})
export type CryptoWithdrawal = z.infer<typeof CryptoWithdrawalSchema>

export const CryptoAddressBookEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  asset: z.string(),
  network: z.string(),
  address: z.string(),
  label: z.string().nullable(),
  addedAt: z.string()
})
export type CryptoAddressBookEntry = z.infer<typeof CryptoAddressBookEntrySchema>

// ─── Inputs ───────────────────────────────────────────────────────

export const FiatDepositInputSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(100).nullable().optional()
})
export type FiatDepositInput = z.infer<typeof FiatDepositInputSchema>

export const FiatWithdrawInputSchema = z.object({
  bankAccountId: z.string(),
  amount: z.number().int().positive()
})
export type FiatWithdrawInput = z.infer<typeof FiatWithdrawInputSchema>

export const CryptoWithdrawInputSchema = z.object({
  asset: z.string(),
  network: z.string(),
  addressBookEntryId: z.string(),
  amount: z.number().positive()
})
export type CryptoWithdrawInput = z.infer<typeof CryptoWithdrawInputSchema>

export const AddAddressBookInputSchema = z.object({
  asset: z.string(),
  network: z.string(),
  address: z.string().min(8),
  label: z.string().max(40).nullable()
})
export type AddAddressBookInput = z.infer<typeof AddAddressBookInputSchema>

// 綁定銀行帳戶的輸入；isVerified / verifiedAt 由 server 寫入
export const AddBankAccountInputSchema = z.object({
  bankCode: z.string().regex(/^\d{3}$/, '銀行代碼需為 3 位數字'),
  bankName: z.string().min(1).max(20),
  // 帳號允許 6-16 位數字，可含 '-' 分隔
  accountNumber: z.string().regex(/^[\d-]{6,20}$/, '帳號格式不正確'),
  accountName: z.string().min(1).max(40)
})
export type AddBankAccountInput = z.infer<typeof AddBankAccountInputSchema>
