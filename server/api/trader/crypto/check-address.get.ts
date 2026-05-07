import { checkBlacklist } from '~~/shared/utils/blacklist'
import { blacklistStore } from '~~/server/utils/blacklist-store'

// 提供前端在輸入提領地址當下做即時黑名單檢查
// 真實情境會 cache + rate limit，這裡 demo 直接同步比對 admin 維護的最新清單
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const address = typeof q.address === 'string' ? q.address : ''
  const result = checkBlacklist(address, blacklistStore.list())
  return {
    address,
    ...result
  }
})
