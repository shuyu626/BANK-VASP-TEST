import { z } from 'zod'
import { UserSchema } from './user'

export const AuthSessionSchema = z.object({
  sessionId: z.string(),
  user: UserSchema,
  issuedAt: z.string(),
  expiresAt: z.string()
})
export type AuthSession = z.infer<typeof AuthSessionSchema>

// VASP 註冊三件套同意：服務條款 / 隱私政策 / 風險揭露 — 三者皆須為 true
const CONSENT_REQUIRED_MESSAGE = 'CONSENT_REQUIRED'
const consentRequired = z.literal(true, { message: CONSENT_REQUIRED_MESSAGE })

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, '密碼至少 8 個字元')
    .regex(/[A-Za-z]/, '密碼需至少包含一個英文字母')
    .regex(/[0-9]/, '密碼需至少包含一個數字'),
  displayName: z.string().min(1).max(40),
  agreedTerms: consentRequired,
  agreedPrivacy: consentRequired,
  agreedRisk: consentRequired
})
export type RegisterInput = z.infer<typeof RegisterInputSchema>

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
export type LoginInput = z.infer<typeof LoginInputSchema>

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(40)
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>

export const TotpInputSchema = z.object({
  sessionChallengeId: z.string(),
  code: z.string().length(6)
})
export type TotpInput = z.infer<typeof TotpInputSchema>
