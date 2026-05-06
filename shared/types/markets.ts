import { z } from 'zod'

export const MarketTickerSchema = z.object({
  symbol: z.string(),
  base: z.string(),
  quote: z.string(),
  name: z.string(),
  price: z.number(),
  change24h: z.number(),
  volume24h: z.number(),
  high24h: z.number(),
  low24h: z.number(),
  icon: z.string()
})
export type MarketTicker = z.infer<typeof MarketTickerSchema>

export const KlinePointSchema = z.object({
  time: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number()
})
export type KlinePoint = z.infer<typeof KlinePointSchema>
