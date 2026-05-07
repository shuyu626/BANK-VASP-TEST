import type { User, KycRecord, BankAccount, TrustAccount } from '~~/shared/types'

export const mockUsers: User[] = [
  {
    id: 'u_001',
    email: 'alice@example.com',
    displayName: '王美玲',
    createdAt: '2026-02-14T09:20:00Z',
    kycStatus: 'approved',
    kycTier: 'tier2',
    riskLevel: 'low',
    isFrozen: false,
    twoFaEnabled: false
  },
  {
    id: 'u_002',
    email: 'bob@example.com',
    displayName: '陳俊宏',
    createdAt: '2026-03-01T14:05:00Z',
    kycStatus: 'pending',
    kycTier: 'tier0',
    riskLevel: 'medium',
    isFrozen: false,
    twoFaEnabled: false
  },
  {
    id: 'u_003',
    email: 'charlie@example.com',
    displayName: '林志偉',
    createdAt: '2025-11-08T03:40:00Z',
    kycStatus: 'approved',
    kycTier: 'tier3',
    riskLevel: 'high',
    isFrozen: false,
    twoFaEnabled: true
  },
  {
    id: 'u_004',
    email: 'diana@example.com',
    displayName: '張雅婷',
    createdAt: '2026-04-18T11:12:00Z',
    kycStatus: 'rejected',
    kycTier: 'tier0',
    riskLevel: 'critical',
    isFrozen: true,
    twoFaEnabled: false
  }
]

export const mockKycRecords: KycRecord[] = [
  {
    id: 'kyc_001', userId: 'u_001',
    submittedAt: '2026-02-14T09:25:00Z',
    reviewedAt: '2026-02-14T15:40:00Z',
    reviewerId: 'admin_01',
    status: 'approved', tier: 'tier2',
    idNumber: '****3821', birthDate: '1990-05-12',
    phone: '0912-***-456', address: '台北市信義區市府路 1 號',
    docIdFrontUrl: '/mock/id-front-001.jpg',
    docIdBackUrl: '/mock/id-back-001.jpg',
    docSelfieUrl: '/mock/selfie-001.jpg',
    docProofOfAddressUrl: '/mock/poa-001.jpg',
    bankVerifiedAt: '2026-02-14T16:00:00Z',
    rejectReason: null
  },
  {
    id: 'kyc_002', userId: 'u_002',
    submittedAt: '2026-04-22T08:10:00Z',
    reviewedAt: null, reviewerId: null,
    status: 'pending', tier: 'tier0',
    idNumber: '****7512', birthDate: '1985-11-23',
    phone: '0933-***-891', address: '新北市板橋區文化路一段 100 號',
    docIdFrontUrl: '/mock/id-front-002.jpg',
    docIdBackUrl: '/mock/id-back-002.jpg',
    docSelfieUrl: '/mock/selfie-002.jpg',
    docProofOfAddressUrl: null,
    bankVerifiedAt: null, rejectReason: null
  },
  {
    id: 'kyc_003', userId: 'u_004',
    submittedAt: '2026-04-18T11:15:00Z',
    reviewedAt: '2026-04-19T02:30:00Z',
    reviewerId: 'admin_02',
    status: 'rejected', tier: 'tier0',
    idNumber: '****0091', birthDate: '1995-08-30',
    phone: '0988-***-223', address: '（地址不符）',
    docIdFrontUrl: '/mock/id-front-004.jpg',
    docIdBackUrl: '/mock/id-back-004.jpg',
    docSelfieUrl: '/mock/selfie-004.jpg',
    docProofOfAddressUrl: null,
    bankVerifiedAt: null,
    rejectReason: '身分證影像模糊，且自拍與證件照人像比對相似度不足'
  }
]

export const mockBankAccounts: BankAccount[] = [
  { id: 'ba_001', userId: 'u_001', bankCode: '805', bankName: '東東商銀',  accountNumber: '012-***-4823', accountName: '王美玲', isVerified: true,  verifiedAt: '2026-02-14T16:00:00Z' },
  { id: 'ba_002', userId: 'u_003', bankCode: '700', bankName: '中華郵政',  accountNumber: '7000***2351', accountName: '林志偉', isVerified: true,  verifiedAt: '2025-11-10T00:00:00Z' },
  { id: 'ba_003', userId: 'u_002', bankCode: '808', bankName: '玉山銀行',  accountNumber: '0808***0977', accountName: '陳俊宏', isVerified: false, verifiedAt: null }
]

export const mockTrustAccounts: TrustAccount[] = [
  { id: 'ta_001', vaspId: 'vasp_demo', userId: 'u_001', virtualAccountNumber: '8056 2001 0001 2345', balance: 284500,  createdAt: '2026-02-14T16:00:00Z' },
  { id: 'ta_003', vaspId: 'vasp_demo', userId: 'u_003', virtualAccountNumber: '8056 2001 0003 7744', balance: 1842000, createdAt: '2025-11-10T00:00:00Z' }
]

export interface CryptoHolding {
  userId: string
  symbol: string        // BTC / ETH / USDT ...
  name: string
  amount: number
  avgCost: number       // 成本價（TWD 計價）
  icon: string
}

export const mockHoldings: CryptoHolding[] = [
  { userId: 'u_001', symbol: 'BTC',  name: 'Bitcoin',  amount: 0.0421,  avgCost: 1980000, icon: '₿' },
  { userId: 'u_001', symbol: 'ETH',  name: 'Ethereum', amount: 1.82,    avgCost: 102000,  icon: 'Ξ' },
  { userId: 'u_001', symbol: 'USDT', name: 'Tether',   amount: 1250.0,  avgCost: 32.4,    icon: '₮' },
  { userId: 'u_003', symbol: 'BTC',  name: 'Bitcoin',  amount: 0.3812,  avgCost: 1880000, icon: '₿' },
  { userId: 'u_003', symbol: 'SOL',  name: 'Solana',   amount: 82.0,    avgCost: 5720,    icon: '◎' }
]
