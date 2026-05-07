import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler((event) => {
  const session = requireAdmin(event)
  return { session }
})
