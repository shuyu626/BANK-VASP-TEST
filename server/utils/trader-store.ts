import type {
  User, KycRecord, AuthSession,
  TrustAccount, BankAccount,
  FiatDeposit, FiatWithdrawal, CryptoWithdrawal,
  CryptoAddressBookEntry, AuditLog,
  Order, Trade,
  ApiKeyRecord
} from '~~/shared/types'
import type { CryptoHolding } from '~~/app/utils/mock/users'
import {
  mockUsers, mockKycRecords,
  mockTrustAccounts, mockBankAccounts, mockHoldings
} from '~~/app/utils/mock/users'
import { mockAuditLogs } from '~~/app/utils/mock/compliance'

// In-memory mock-backend state. Lives for the Nitro process lifetime.
// Wiped on every `npm run build` / server restart — documented in design.md D3.

interface TraderUserRecord {
  user: User
  password: string       // plaintext demo only, never sent to client
  totpEnabled: boolean
}

interface SessionRecord {
  session: AuthSession
  pendingTotp: boolean
  challengeId: string | null
}

let initialized = false

const users = new Map<string, TraderUserRecord>()
const usersById = new Map<string, TraderUserRecord>()
const sessions = new Map<string, SessionRecord>()
const challenges = new Map<string, string>()
const kycSubmissions = new Map<string, KycRecord>()

// Day 3 additions
const trustAccounts = new Map<string, TrustAccount>()                  // userId → account
const bankAccounts = new Map<string, BankAccount[]>()                  // userId → accounts
const holdings = new Map<string, CryptoHolding[]>()                    // userId → holdings
const fiatDeposits = new Map<string, FiatDeposit[]>()                  // userId → deposits
const fiatWithdrawals = new Map<string, FiatWithdrawal[]>()            // userId → withdrawals
const cryptoWithdrawals = new Map<string, CryptoWithdrawal[]>()        // userId → withdrawals
const addressBooks = new Map<string, CryptoAddressBookEntry[]>()       // userId → entries
const orders = new Map<string, Order[]>()                              // userId → orders
const trades = new Map<string, Trade[]>()                              // userId → trades
const apiKeys = new Map<string, ApiKeyRecord[]>()                      // userId → keys
const auditLog: AuditLog[] = []

function ensureSeeded() {
  if (initialized) return
  initialized = true

  for (const u of mockUsers) {
    const record: TraderUserRecord = {
      user: { ...u },
      password: 'password',
      totpEnabled: u.twoFaEnabled
    }
    users.set(u.email, record)
    usersById.set(u.id, record)
  }
  for (const k of mockKycRecords) {
    kycSubmissions.set(k.userId, { ...k })
  }
  for (const t of mockTrustAccounts) {
    trustAccounts.set(t.userId, { ...t })
  }
  for (const b of mockBankAccounts) {
    const list = bankAccounts.get(b.userId) ?? []
    list.push({ ...b })
    bankAccounts.set(b.userId, list)
  }
  for (const h of mockHoldings) {
    const list = holdings.get(h.userId) ?? []
    list.push({ ...h })
    holdings.set(h.userId, list)
  }
  // Seed audit log from compliance mocks (handCurated 5 + generated 100k).
  for (const log of mockAuditLogs) auditLog.push(log)
}

// ─── Time helpers ────────────────────────────────────────────────

function sameDayIso(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

function sameMonthIso(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

// ─── Map<userId, T[]> helpers ────────────────────────────────────
// 多個 entity（deposit/withdrawal/order）都是 userId → entity[] 結構，find/update by id 的查找邏輯共用。

function findInUserMap<T extends { id: string }>(map: Map<string, T[]>, id: string): T | undefined {
  for (const list of map.values()) {
    const found = list.find(x => x.id === id)
    if (found) return found
  }
  return undefined
}

function updateInUserMap<T extends { id: string }>(
  map: Map<string, T[]>,
  id: string,
  patch: Partial<T>
): T | undefined {
  for (const list of map.values()) {
    const i = list.findIndex(x => x.id === id)
    if (i >= 0) {
      list[i] = { ...list[i]!, ...patch }
      return list[i]
    }
  }
  return undefined
}

// ─── Store API ───────────────────────────────────────────────────

export const traderStore = {
  findUserByEmail(email: string): TraderUserRecord | undefined {
    ensureSeeded()
    return users.get(email.toLowerCase())
  },
  findUserById(id: string): TraderUserRecord | undefined {
    ensureSeeded()
    return usersById.get(id)
  },
  createUser(input: { email: string; password: string; displayName: string }): TraderUserRecord {
    ensureSeeded()
    const email = input.email.toLowerCase()
    if (users.has(email)) throw createError({ statusCode: 409, statusMessage: 'EMAIL_TAKEN' })
    const id = `u_${Math.random().toString(36).slice(2, 8)}`
    const newUser: User = {
      id, email,
      displayName: input.displayName,
      createdAt: new Date().toISOString(),
      kycStatus: 'pending', kycTier: 'tier0',
      riskLevel: 'low', isFrozen: false, twoFaEnabled: false
    }
    const record: TraderUserRecord = { user: newUser, password: input.password, totpEnabled: false }
    users.set(email, record)
    usersById.set(id, record)
    return record
  },
  updateProfile(userId: string, patch: { displayName?: string }): TraderUserRecord {
    ensureSeeded()
    const record = usersById.get(userId)
    if (!record) throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })
    if (patch.displayName !== undefined) record.user.displayName = patch.displayName
    return record
  },
  createSession(userId: string): AuthSession {
    ensureSeeded()
    const record = usersById.get(userId)
    if (!record) throw createError({ statusCode: 404, statusMessage: 'USER_NOT_FOUND' })
    const sessionId = `sess_${Math.random().toString(36).slice(2, 10)}`
    const now = Date.now()
    const session: AuthSession = {
      sessionId, user: record.user,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    sessions.set(sessionId, { session, pendingTotp: false, challengeId: null })
    return session
  },
  findSession(sessionId: string): AuthSession | undefined {
    ensureSeeded()
    const record = sessions.get(sessionId)
    return record?.pendingTotp ? undefined : record?.session
  },
  removeSession(sessionId: string): void {
    ensureSeeded()
    sessions.delete(sessionId)
  },
  createTotpChallenge(userId: string): string {
    ensureSeeded()
    const challengeId = `chal_${Math.random().toString(36).slice(2, 10)}`
    challenges.set(challengeId, userId)
    return challengeId
  },
  resolveTotpChallenge(challengeId: string): string | undefined {
    ensureSeeded()
    return challenges.get(challengeId)
  },
  clearTotpChallenge(challengeId: string): void {
    ensureSeeded()
    challenges.delete(challengeId)
  },
  getKycRecord(userId: string): KycRecord | undefined {
    ensureSeeded()
    return kycSubmissions.get(userId)
  },
  upsertKycRecord(record: KycRecord): void {
    ensureSeeded()
    kycSubmissions.set(record.userId, record)
    const u = usersById.get(record.userId)
    if (u) u.user.kycStatus = record.status
  },
  setUserKyc(userId: string, status: User['kycStatus'], tier: User['kycTier']): void {
    ensureSeeded()
    const u = usersById.get(userId)
    if (u) { u.user.kycStatus = status; u.user.kycTier = tier }
  },

  // ─── Trust account ────────────────────────────────────────────
  getTrustAccount(userId: string): TrustAccount | undefined {
    ensureSeeded()
    return trustAccounts.get(userId)
  },
  createTrustAccount(input: { userId: string; vaspId: string; virtualAccountNumber: string }): TrustAccount {
    ensureSeeded()
    const ta: TrustAccount = {
      id: `ta_${Math.random().toString(36).slice(2, 8)}`,
      vaspId: input.vaspId,
      userId: input.userId,
      virtualAccountNumber: input.virtualAccountNumber,
      balance: 0,
      createdAt: new Date().toISOString()
    }
    trustAccounts.set(input.userId, ta)
    return ta
  },
  adjustFiatBalance(userId: string, delta: number): TrustAccount | undefined {
    ensureSeeded()
    const ta = trustAccounts.get(userId)
    if (!ta) return undefined
    ta.balance += delta
    return ta
  },
  // ─── Admin-facing user mutations ──────────────────────────────
  listAllUsers(): User[] {
    ensureSeeded()
    return Array.from(usersById.values()).map(r => r.user)
  },
  listAllKycRecords(): KycRecord[] {
    ensureSeeded()
    return Array.from(kycSubmissions.values())
  },
  setUserFrozen(userId: string, frozen: boolean): User | undefined {
    ensureSeeded()
    const r = usersById.get(userId)
    if (!r) return undefined
    r.user.isFrozen = frozen
    return r.user
  },
  setUserRisk(userId: string, level: User['riskLevel']): User | undefined {
    ensureSeeded()
    const r = usersById.get(userId)
    if (!r) return undefined
    r.user.riskLevel = level
    return r.user
  },

  // ─── Bank accounts ────────────────────────────────────────────
  getBankAccounts(userId: string): BankAccount[] {
    ensureSeeded()
    return bankAccounts.get(userId) ?? []
  },
  addBankAccount(account: BankAccount): void {
    ensureSeeded()
    const list = bankAccounts.get(account.userId) ?? []
    list.push({ ...account })
    bankAccounts.set(account.userId, list)
  },
  removeBankAccount(userId: string, id: string): boolean {
    ensureSeeded()
    const list = bankAccounts.get(userId) ?? []
    const idx = list.findIndex(b => b.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    bankAccounts.set(userId, list)
    return true
  },
  /** Bank teller verify KYC 比對通過時，連帶把該用戶所有未驗證的銀行帳號標為已驗證 */
  verifyAllBankAccounts(userId: string, at: string): number {
    ensureSeeded()
    const list = bankAccounts.get(userId) ?? []
    let n = 0
    for (const b of list) {
      if (!b.isVerified) {
        b.isVerified = true
        b.verifiedAt = at
        n += 1
      }
    }
    return n
  },

  // ─── Holdings ─────────────────────────────────────────────────
  getHoldings(userId: string): CryptoHolding[] {
    ensureSeeded()
    return holdings.get(userId) ?? []
  },
  getHolding(userId: string, symbol: string): CryptoHolding | undefined {
    ensureSeeded()
    return holdings.get(userId)?.find(h => h.symbol === symbol)
  },
  adjustHolding(userId: string, symbol: string, delta: number): void {
    ensureSeeded()
    const list = holdings.get(userId) ?? []
    const existing = list.find(h => h.symbol === symbol)
    if (existing) {
      existing.amount += delta
      if (existing.amount < 0) existing.amount = 0
    }
  },

  // ─── Fiat deposits ────────────────────────────────────────────
  getFiatDeposits(userId: string): FiatDeposit[] {
    ensureSeeded()
    return fiatDeposits.get(userId) ?? []
  },
  addFiatDeposit(deposit: FiatDeposit): void {
    ensureSeeded()
    const list = fiatDeposits.get(deposit.userId) ?? []
    list.unshift(deposit)
    fiatDeposits.set(deposit.userId, list)
  },
  updateFiatDeposit(id: string, patch: Partial<FiatDeposit>): FiatDeposit | undefined {
    ensureSeeded()
    return updateInUserMap(fiatDeposits, id, patch)
  },
  findFiatDeposit(id: string): FiatDeposit | undefined {
    ensureSeeded()
    return findInUserMap(fiatDeposits, id)
  },

  // ─── Fiat withdrawals ─────────────────────────────────────────
  getFiatWithdrawals(userId: string): FiatWithdrawal[] {
    ensureSeeded()
    return fiatWithdrawals.get(userId) ?? []
  },
  addFiatWithdrawal(w: FiatWithdrawal): void {
    ensureSeeded()
    const list = fiatWithdrawals.get(w.userId) ?? []
    list.unshift(w)
    fiatWithdrawals.set(w.userId, list)
  },
  updateFiatWithdrawal(id: string, patch: Partial<FiatWithdrawal>): FiatWithdrawal | undefined {
    ensureSeeded()
    return updateInUserMap(fiatWithdrawals, id, patch)
  },
  findFiatWithdrawal(id: string): FiatWithdrawal | undefined {
    ensureSeeded()
    return findInUserMap(fiatWithdrawals, id)
  },

  // ─── Crypto withdrawals ───────────────────────────────────────
  getCryptoWithdrawals(userId: string): CryptoWithdrawal[] {
    ensureSeeded()
    return cryptoWithdrawals.get(userId) ?? []
  },
  addCryptoWithdrawal(w: CryptoWithdrawal): void {
    ensureSeeded()
    const list = cryptoWithdrawals.get(w.userId) ?? []
    list.unshift(w)
    cryptoWithdrawals.set(w.userId, list)
  },
  updateCryptoWithdrawal(id: string, patch: Partial<CryptoWithdrawal>): CryptoWithdrawal | undefined {
    ensureSeeded()
    return updateInUserMap(cryptoWithdrawals, id, patch)
  },
  findCryptoWithdrawal(id: string): CryptoWithdrawal | undefined {
    ensureSeeded()
    return findInUserMap(cryptoWithdrawals, id)
  },

  // ─── Address book ─────────────────────────────────────────────
  getAddressBook(userId: string): CryptoAddressBookEntry[] {
    ensureSeeded()
    return addressBooks.get(userId) ?? []
  },
  addAddressBookEntry(entry: CryptoAddressBookEntry): void {
    ensureSeeded()
    const list = addressBooks.get(entry.userId) ?? []
    list.unshift(entry)
    addressBooks.set(entry.userId, list)
  },
  findAddressBookEntry(userId: string, id: string): CryptoAddressBookEntry | undefined {
    ensureSeeded()
    return addressBooks.get(userId)?.find(e => e.id === id)
  },

  // ─── Aggregates / limits ──────────────────────────────────────
  getDailyDepositTotal(userId: string, isoDate: string): number {
    ensureSeeded()
    const list = fiatDeposits.get(userId) ?? []
    return list
      .filter(d => d.status === 'completed' || d.status === 'pending')
      .filter(d => sameDayIso(d.submittedAt, isoDate))
      .reduce((sum, d) => sum + d.amount, 0)
  },
  getDailyWithdrawTotal(userId: string, isoDate: string): number {
    ensureSeeded()
    const list = fiatWithdrawals.get(userId) ?? []
    return list
      .filter(w => w.status !== 'rejected' && w.status !== 'failed')
      .filter(w => sameDayIso(w.submittedAt, isoDate))
      .reduce((sum, w) => sum + w.amount, 0)
  },
  getMonthlyWithdrawTotal(userId: string, isoDate: string): number {
    ensureSeeded()
    const list = fiatWithdrawals.get(userId) ?? []
    return list
      .filter(w => w.status !== 'rejected' && w.status !== 'failed')
      .filter(w => sameMonthIso(w.submittedAt, isoDate))
      .reduce((sum, w) => sum + w.amount, 0)
  },

  // ─── Orders ───────────────────────────────────────────────────
  getUserOrders(userId: string): Order[] {
    ensureSeeded()
    return orders.get(userId) ?? []
  },
  addOrder(order: Order): void {
    ensureSeeded()
    const list = orders.get(order.userId) ?? []
    list.unshift(order)
    orders.set(order.userId, list)
  },
  updateOrder(id: string, patch: Partial<Order>): Order | undefined {
    ensureSeeded()
    return updateInUserMap(orders, id, { ...patch, updatedAt: new Date().toISOString() })
  },
  findOrder(id: string): Order | undefined {
    ensureSeeded()
    return findInUserMap(orders, id)
  },
  getAllOrders(): Order[] {
    ensureSeeded()
    const all: Order[] = []
    for (const list of orders.values()) all.push(...list)
    return all
  },

  // ─── Trades ───────────────────────────────────────────────────
  getUserTrades(userId: string): Trade[] {
    ensureSeeded()
    return trades.get(userId) ?? []
  },
  addTrade(trade: Trade): void {
    ensureSeeded()
    for (const userId of [trade.buyerId, trade.sellerId]) {
      const list = trades.get(userId) ?? []
      list.unshift(trade)
      trades.set(userId, list)
    }
  },

  // ─── API keys ─────────────────────────────────────────────────
  getApiKeys(userId: string): ApiKeyRecord[] {
    ensureSeeded()
    return apiKeys.get(userId) ?? []
  },
  createApiKey(userId: string, label: string, permissions: ApiKeyRecord['permissions']): { record: ApiKeyRecord; secret: string } {
    ensureSeeded()
    const rand = () => Math.random().toString(36).slice(2)
    const record: ApiKeyRecord = {
      id: `ak_${rand().slice(0, 10)}`,
      userId, label, permissions,
      createdAt: new Date().toISOString(),
      lastUsedAt: null
    }
    const list = apiKeys.get(userId) ?? []
    list.unshift(record)
    apiKeys.set(userId, list)
    return { record, secret: `sk_${rand()}${rand()}`.slice(0, 40) }
  },
  deleteApiKey(userId: string, id: string): boolean {
    ensureSeeded()
    const list = apiKeys.get(userId) ?? []
    const i = list.findIndex(k => k.id === id)
    if (i < 0) return false
    list.splice(i, 1)
    apiKeys.set(userId, list)
    return true
  },

  // ─── User mutations (settings) ────────────────────────────────
  updatePassword(userId: string, newPassword: string): boolean {
    ensureSeeded()
    const u = usersById.get(userId)
    if (!u) return false
    u.password = newPassword
    return true
  },
  setTwoFa(userId: string, enabled: boolean): boolean {
    ensureSeeded()
    const u = usersById.get(userId)
    if (!u) return false
    u.totpEnabled = enabled
    u.user.twoFaEnabled = enabled
    return true
  },

  // ─── Login history (audit-backed) ─────────────────────────────
  getLoginHistory(userId: string, limit = 20): AuditLog[] {
    ensureSeeded()
    return auditLog
      .filter(l => l.actor === userId && l.action === 'auth.login')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit)
  },

  // ─── Audit log ────────────────────────────────────────────────
  appendAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    ensureSeeded()
    const log: AuditLog = {
      id: `log_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...entry
    }
    auditLog.push(log)
    return log
  },
  getAuditLog(): AuditLog[] {
    ensureSeeded()
    return auditLog
  }
}

export function maskIdNumber(full: string): string {
  const tail = full.slice(-4)
  return `****${tail}`
}
