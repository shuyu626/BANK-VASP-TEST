import { z } from 'zod'

export const ChangePasswordInputSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/)
})
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>

export const ToggleTotpInputSchema = z.object({
  enable: z.boolean(),
  code: z.string().length(6),
  password: z.string().nullable().optional()
})
export type ToggleTotpInput = z.infer<typeof ToggleTotpInputSchema>

export const ApiKeyPermissionSchema = z.enum(['read', 'trade'])
export type ApiKeyPermission = z.infer<typeof ApiKeyPermissionSchema>

export const ApiKeyRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string(),
  permissions: z.array(ApiKeyPermissionSchema),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable()
})
export type ApiKeyRecord = z.infer<typeof ApiKeyRecordSchema>

export const CreateApiKeyInputSchema = z.object({
  label: z.string().min(1).max(40),
  permissions: z.array(ApiKeyPermissionSchema).min(1)
})
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>

export const TraderPrefsSchema = z.object({
  marketColors: z.enum(['asian', 'western']).default('asian'),
  defaultPair: z.string().default('BTC-TWD'),
  notifications: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true)
  }).default({ email: true, inApp: true })
})
export type TraderPrefs = z.infer<typeof TraderPrefsSchema>
