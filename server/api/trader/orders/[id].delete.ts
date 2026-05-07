import { requireSession } from '~~/server/utils/require-session'
import { cancelOrder } from '~~/server/utils/matching-engine'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  const id = getRouterParam(event, 'id') ?? ''
  const order = cancelOrder(session.user.id, id)
  return { order }
})
