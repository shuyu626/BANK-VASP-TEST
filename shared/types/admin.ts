import { z } from 'zod'
import { RiskLevelSchema, KycTierSchema } from './index'

export const AdminRoleSchema = z.enum(['ops', 'compliance', 'risk'])
export type AdminRole = z.infer<typeof AdminRoleSchema>

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: AdminRoleSchema,
  createdAt: z.string()
})
export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminSessionSchema = z.object({
  sessionId: z.string(),
  admin: AdminUserSchema,
  issuedAt: z.string(),
  expiresAt: z.string()
})
export type AdminSession = z.infer<typeof AdminSessionSchema>

export const AdminLoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
export type AdminLoginInput = z.infer<typeof AdminLoginInputSchema>

export const KycApproveInputSchema = z.object({
  tier: KycTierSchema
})
export type KycApproveInput = z.infer<typeof KycApproveInputSchema>

export const KycRejectInputSchema = z.object({
  reason: z.string().min(1).max(300)
})
export type KycRejectInput = z.infer<typeof KycRejectInputSchema>

export const FreezeUserInputSchema = z.object({
  frozen: z.boolean(),
  reason: z.string().max(300).nullable().optional()
})
export type FreezeUserInput = z.infer<typeof FreezeUserInputSchema>

export const SetRiskLevelInputSchema = z.object({
  level: RiskLevelSchema,
  note: z.string().max(300).nullable().optional()
})
export type SetRiskLevelInput = z.infer<typeof SetRiskLevelInputSchema>

// ─── Day 7 — admin compliance actions ─────────────────────────────

export const AlertResolutionSchema = z.enum(['false_positive', 'escalated_to_sar', 'frozen_account'])
export type AlertResolution = z.infer<typeof AlertResolutionSchema>

export const ResolveAlertInputSchema = z.object({
  resolution: AlertResolutionSchema,
  note: z.string().max(500).nullable().optional(),
  narrative: z.string().max(1000).nullable().optional()
})
export type ResolveAlertInput = z.infer<typeof ResolveAlertInputSchema>

export const RejectWithdrawalInputSchema = z.object({
  reason: z.string().min(1).max(300)
})
export type RejectWithdrawalInput = z.infer<typeof RejectWithdrawalInputSchema>

export const HoldDepositInputSchema = z.object({
  reason: z.string().max(300).nullable().optional()
})
export type HoldDepositInput = z.infer<typeof HoldDepositInputSchema>

export const MarkReportInputSchema = z.object({
  status: z.enum(['submitted', 'accepted'])
})
export type MarkReportInput = z.infer<typeof MarkReportInputSchema>
