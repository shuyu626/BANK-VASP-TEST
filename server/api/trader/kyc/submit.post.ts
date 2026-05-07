import type { KycRecord } from '~~/shared/types'
import { KycSubmissionInputSchema } from '~~/shared/types'
import { traderStore, maskIdNumber } from '~~/server/utils/trader-store'

const COOKIE_NAME = 'trader_sid'

export default defineEventHandler(async (event) => {
  const sid = getCookie(event, COOKIE_NAME)
  const session = sid ? traderStore.findSession(sid) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'NOT_AUTHENTICATED' })
  }

  const body = await readBody(event)
  const parsed = KycSubmissionInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      data: { issues: parsed.error.issues }
    })
  }

  const input = parsed.data
  const now = new Date().toISOString()
  const record: KycRecord = {
    id: `kyc_${Math.random().toString(36).slice(2, 8)}`,
    userId: session.user.id,
    submittedAt: now,
    reviewedAt: null,
    reviewerId: null,
    status: 'pending',
    tier: 'tier0',
    idNumber: maskIdNumber(input.idNumber),
    birthDate: input.birthDate,
    phone: input.phone,
    address: input.address,
    docIdFrontUrl: `/mock/${input.docIdFront.filename}`,
    docIdBackUrl: `/mock/${input.docIdBack.filename}`,
    docSelfieUrl: `/mock/${input.docSelfie.filename}`,
    docProofOfAddressUrl: input.docProofOfAddress
      ? `/mock/${input.docProofOfAddress.filename}`
      : null,
    bankVerifiedAt: null,
    rejectReason: null
  }

  traderStore.upsertKycRecord(record)
  traderStore.setUserKyc(session.user.id, 'pending', 'tier0')

  return { record }
})
