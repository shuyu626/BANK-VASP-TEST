import { PlaceOrderInputSchema } from '~~/shared/types'
import { requireSession } from '~~/server/utils/require-session'
import { placeOrder } from '~~/server/utils/matching-engine'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  if (session.user.isFrozen) {
    throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_FROZEN' })
  }
  const body = await readBody(event)
  const parsed = PlaceOrderInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR' })
  }
  const order = placeOrder({
    user: session.user,
    symbol: parsed.data.symbol,
    side: parsed.data.side,
    type: parsed.data.type,
    price: parsed.data.price,
    quantity: parsed.data.quantity
  })
  return { order }
})
