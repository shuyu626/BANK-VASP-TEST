import { z } from 'zod'
import { AmlAlertTypeSchema, RiskLevelSchema } from './enums'

export const AmlAlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: AmlAlertTypeSchema,
  severity: RiskLevelSchema,
  description: z.string(),
  relatedTxId: z.string().nullable(),
  amount: z.number().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolution: z.enum(['false_positive', 'escalated_to_sar', 'frozen_account']).nullable()
})
export type AmlAlert = z.infer<typeof AmlAlertSchema>

export const AuditLogSchema = z.object({
  id: z.string(),
  actor: z.string(),               // userId / adminId / 'system'
  actorRole: z.enum(['user', 'admin', 'compliance', 'ops', 'risk', 'bank', 'system']),
  action: z.string(),              // 例：'kyc.approve', 'fiat.withdraw.request'
  resourceType: z.string(),
  resourceId: z.string(),
  metadata: z.record(z.unknown()),
  ipAddress: z.string().nullable(),
  timestamp: z.string()            // WORM, append-only
})
export type AuditLog = z.infer<typeof AuditLogSchema>

// CTR：Currency Transaction Report 大額交易報告
// 台灣：單筆或當日累積 NT$50 萬（加密等值）以上需報送
export const CtrReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  totalAmount: z.number(),
  txIds: z.array(z.string()),
  reportDate: z.string(),
  status: z.enum(['draft', 'submitted', 'accepted']),
  submittedAt: z.string().nullable()
})
export type CtrReport = z.infer<typeof CtrReportSchema>

// SAR：Suspicious Activity Report 可疑交易報告
export const SarReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  alertId: z.string(),
  narrative: z.string(),           // 調查敘述
  status: z.enum(['draft', 'under_review', 'submitted', 'accepted']),
  createdBy: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().nullable()
})
export type SarReport = z.infer<typeof SarReportSchema>

// 黑名單 admin 新增條目
export const AddBlacklistInputSchema = z.object({
  pattern: z.string().min(4, '至少 4 個字元').max(80),
  reason: z.string().min(1).max(200),
  source: z.string().min(1).max(40)
})
export type AddBlacklistInput = z.infer<typeof AddBlacklistInputSchema>
