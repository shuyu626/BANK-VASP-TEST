import type { AmlAlert, AuditLog, CtrReport, SarReport } from '~~/shared/types'

export const mockAmlAlerts: AmlAlert[] = [
  {
    id: 'aml_001', userId: 'u_003', type: 'large_amount', severity: 'high',
    description: '單日累積入金 NT$1,500,000，超過 CTR 門檻 (NT$500,000)',
    relatedTxId: 'fd_0057', amount: 1500000,
    createdAt: '2026-04-22T22:15:00Z',
    resolvedAt: null, resolvedBy: null, resolution: null
  },
  {
    id: 'aml_002', userId: 'u_004', type: 'blacklist_hit', severity: 'critical',
    description: '提領地址命中 OFAC SDN 清單',
    relatedTxId: 'cw_0012', amount: 48000,
    createdAt: '2026-04-19T02:10:00Z',
    resolvedAt: '2026-04-19T02:30:00Z',
    resolvedBy: 'compliance_01',
    resolution: 'frozen_account'
  },
  {
    id: 'aml_003', userId: 'u_002', type: 'velocity', severity: 'medium',
    description: '24 小時內下單 58 筆，交易頻率顯著高於同分級平均',
    relatedTxId: null, amount: null,
    createdAt: '2026-04-23T04:50:00Z',
    resolvedAt: null, resolvedBy: null, resolution: null
  }
]

export const mockAuditLogs: AuditLog[] = [
  { id: 'log_0001', actor: 'u_001',        actorRole: 'user',       action: 'auth.login',            resourceType: 'session', resourceId: 'sess_a', metadata: {}, ipAddress: '203.0.***.42',  timestamp: '2026-04-23T00:15:00Z' },
  { id: 'log_0002', actor: 'admin_01',     actorRole: 'admin',      action: 'kyc.approve',           resourceType: 'kyc',     resourceId: 'kyc_001', metadata: { tier: 'tier2' }, ipAddress: '10.0.1.5', timestamp: '2026-02-14T15:40:00Z' },
  { id: 'log_0003', actor: 'system',       actorRole: 'system',     action: 'aml.alert.trigger',     resourceType: 'aml',     resourceId: 'aml_001', metadata: { type: 'large_amount' }, ipAddress: null, timestamp: '2026-04-22T22:15:00Z' },
  { id: 'log_0004', actor: 'compliance_01',actorRole: 'compliance', action: 'aml.alert.resolve',     resourceType: 'aml',     resourceId: 'aml_002', metadata: { resolution: 'frozen_account' }, ipAddress: '10.0.1.8', timestamp: '2026-04-19T02:30:00Z' },
  { id: 'log_0005', actor: 'bank_teller_3',actorRole: 'bank',       action: 'fiat.deposit.confirm',  resourceType: 'deposit', resourceId: 'fd_0057', metadata: { amount: 1500000 }, ipAddress: '10.50.2.1', timestamp: '2026-04-22T22:10:00Z' }
]

export const mockCtrReports: CtrReport[] = [
  {
    id: 'ctr_0001', userId: 'u_003',
    totalAmount: 1500000,
    txIds: ['fd_0057'],
    reportDate: '2026-04-22',
    status: 'draft',
    submittedAt: null
  }
]

export const mockSarReports: SarReport[] = [
  {
    id: 'sar_0001', userId: 'u_004', alertId: 'aml_002',
    narrative: '客戶 u_004 提領 0.73 BTC 至外部地址 bc1q...9rdf，該地址已於 OFAC SDN 清單註記，關聯俄羅斯制裁實體。已立即凍結帳戶，建議通報調查局。',
    status: 'under_review',
    createdBy: 'compliance_01',
    createdAt: '2026-04-19T02:35:00Z',
    submittedAt: null
  }
]
