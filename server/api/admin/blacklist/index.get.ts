import { blacklistStore } from '~~/server/utils/blacklist-store'
import { requireAdmin } from '~~/server/utils/require-admin'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return { entries: blacklistStore.list() }
})
