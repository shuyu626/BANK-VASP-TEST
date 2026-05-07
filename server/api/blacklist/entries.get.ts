import { blacklistStore } from '~~/server/utils/blacklist-store'

// 公開的黑名單條目讀取（trader withdraw-crypto 即時比對 / bank 端瀏覽）。
// 黑名單本身無敏感性，回傳整份清單即可。
export default defineEventHandler(() => {
  return { entries: blacklistStore.list() }
})
