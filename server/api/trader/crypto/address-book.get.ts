import { traderStore } from '~~/server/utils/trader-store'
import { requireSession } from '~~/server/utils/require-session'

export default defineEventHandler((event) => {
  const session = requireSession(event)
  return {
    entries: traderStore.getAddressBook(session.user.id)
  }
})
