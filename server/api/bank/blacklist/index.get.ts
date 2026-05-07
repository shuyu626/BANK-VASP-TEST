import { blacklistStore } from '~~/server/utils/blacklist-store'

// 銀行端唯讀檢視；金管會可能會問「銀行也能看到 VASP 維護的黑名單嗎」
export default defineEventHandler(() => {
  return { entries: blacklistStore.list() }
})
