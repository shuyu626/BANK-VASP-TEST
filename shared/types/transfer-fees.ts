// Single source of truth for all transfer fees

export interface FiatWithdrawFee {
  fixedTwd: number
  minAmount: number
}

export interface CryptoWithdrawFee {
  network: string
  fee: number
  minAmount: number
}

export interface TransferFeeTable {
  fiatWithdraw: FiatWithdrawFee
  cryptoWithdraw: Record<string, CryptoWithdrawFee>
}

export const TRANSFER_FEES: TransferFeeTable = {
  fiatWithdraw: {
    fixedTwd: 15,
    minAmount: 100
  },
  cryptoWithdraw: {
    BTC:  { network: 'Bitcoin',  fee: 0.0002, minAmount: 0.001 },
    ETH:  { network: 'Ethereum', fee: 0.003,  minAmount: 0.01 },
    USDT: { network: 'TRC20',    fee: 1,      minAmount: 10 },
    SOL:  { network: 'Solana',   fee: 0.01,   minAmount: 0.1 }
  }
}

export const CTR_THRESHOLD_TWD = 500_000

// Simulated delays (milliseconds) — tune here, engine uses these as source
export const SETTLEMENT_DELAYS = {
  fiatDepositToCompleted: 3_000,
  fiatWithdrawToApproved: 5_000,
  fiatWithdrawApprovedToCompleted: 3_000,
  cryptoWithdrawToCompleted: 10_000,
  newAddressCooldownMs: 30_000
}
