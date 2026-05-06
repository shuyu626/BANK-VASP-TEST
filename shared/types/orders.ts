import { z } from 'zod'
import { OrderSideSchema, OrderTypeSchema, OrderStatusSchema } from './enums'

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  symbol: z.string(),              // 例：BTC/USDT
  side: OrderSideSchema,
  type: OrderTypeSchema,
  price: z.number().nullable(),    // market 單為 null
  quantity: z.number(),
  filledQty: z.number(),
  avgFillPrice: z.number().nullable(),
  status: OrderStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
})
export type Order = z.infer<typeof OrderSchema>

export const TradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  buyOrderId: z.string(),
  sellOrderId: z.string(),
  price: z.number(),
  quantity: z.number(),
  timestamp: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  fee: z.number()
})
export type Trade = z.infer<typeof TradeSchema>

export const PlaceOrderInputSchema = z.object({
  symbol: z.string(),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  price: z.number().positive().nullable(),
  quantity: z.number().positive()
})
export type PlaceOrderInput = z.infer<typeof PlaceOrderInputSchema>

export const OrderBookLevelSchema = z.object({
  price: z.number(),
  quantity: z.number()
})
export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>

export const OrderBookSnapshotSchema = z.object({
  symbol: z.string(),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
  timestamp: z.string()
})
export type OrderBookSnapshot = z.infer<typeof OrderBookSnapshotSchema>
