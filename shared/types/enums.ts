// 跨 domain 共用的 enum schemas
import { z } from 'zod'

export const KycStatusSchema = z.enum(['pending', 'approved', 'rejected', 'resubmit'])
export type KycStatus = z.infer<typeof KycStatusSchema>

export const KycTierSchema = z.enum(['tier0', 'tier1', 'tier2', 'tier3'])
export type KycTier = z.infer<typeof KycTierSchema>

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])
export type RiskLevel = z.infer<typeof RiskLevelSchema>

export const FiatTxStatusSchema = z.enum([
  'pending',      // 待審核
  'reviewing',    // 人工覆核中
  'approved',     // 已核准
  'completed',    // 已到帳 / 已出款
  'rejected',     // 拒絕
  'failed'        // 執行失敗
])
export type FiatTxStatus = z.infer<typeof FiatTxStatusSchema>

export const OrderSideSchema = z.enum(['buy', 'sell'])
export type OrderSide = z.infer<typeof OrderSideSchema>

export const OrderTypeSchema = z.enum(['limit', 'market'])
export type OrderType = z.infer<typeof OrderTypeSchema>

export const OrderStatusSchema = z.enum([
  'open', 'partial', 'filled', 'cancelled', 'rejected'
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const AmlAlertTypeSchema = z.enum([
  'blacklist_hit',     // 黑名單命中（OFAC/UN/聯合國）
  'large_amount',      // 大額交易（CTR 門檻）
  'structuring',       // 分拆交易
  'rapid_turnover',    // 快速進出
  'high_risk_region',  // 高風險地區
  'velocity'           // 交易頻率異常
])
export type AmlAlertType = z.infer<typeof AmlAlertTypeSchema>
