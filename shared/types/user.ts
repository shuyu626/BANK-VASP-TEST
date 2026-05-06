import { z } from 'zod'
import { KycStatusSchema, KycTierSchema, RiskLevelSchema } from './enums'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.string(),        // ISO
  kycStatus: KycStatusSchema,
  kycTier: KycTierSchema,
  riskLevel: RiskLevelSchema,
  isFrozen: z.boolean(),
  twoFaEnabled: z.boolean()
})
export type User = z.infer<typeof UserSchema>
