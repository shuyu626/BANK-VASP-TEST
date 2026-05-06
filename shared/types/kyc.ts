import { z } from 'zod'
import { KycStatusSchema, KycTierSchema } from './enums'

export const KycRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewerId: z.string().nullable(),
  status: KycStatusSchema,
  tier: KycTierSchema,
  idNumber: z.string(),         // 身分證末四碼
  birthDate: z.string(),
  phone: z.string(),
  address: z.string(),
  docIdFrontUrl: z.string(),
  docIdBackUrl: z.string(),
  docSelfieUrl: z.string(),
  docProofOfAddressUrl: z.string().nullable(),
  bankVerifiedAt: z.string().nullable(),
  rejectReason: z.string().nullable()
})
export type KycRecord = z.infer<typeof KycRecordSchema>

export const UploadedDocSchema = z.object({
  filename: z.string(),
  size: z.number().int().nonnegative(),
  mimeType: z.string()
})
export type UploadedDoc = z.infer<typeof UploadedDocSchema>

export const KycSubmissionInputSchema = z.object({
  fullName: z.string().min(1),
  idNumber: z.string().min(8).max(20),  // full, server masks to last 4
  birthDate: z.string(),                  // YYYY-MM-DD
  phone: z.string().min(1),
  address: z.string().min(1),
  docIdFront: UploadedDocSchema,
  docIdBack: UploadedDocSchema,
  docSelfie: UploadedDocSchema,
  docProofOfAddress: UploadedDocSchema.nullable()
})
export type KycSubmissionInput = z.infer<typeof KycSubmissionInputSchema>
