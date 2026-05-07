import { mockMarkets, mockMarketsTwd } from '~~/app/utils/mock/markets'

export default defineEventHandler(() => {
  return { tickers: [...mockMarketsTwd, ...mockMarkets] }
})
