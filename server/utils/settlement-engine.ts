import { traderStore } from './trader-store'
import { amlStore } from './aml-store'
import { reportStore } from './report-store'
import { SETTLEMENT_DELAYS, CTR_THRESHOLD_TWD } from '~~/shared/types/transfer-fees'

// Simulated settlement engine. Uses setTimeout to advance pending records
// through their lifecycle. Lives in Nitro process memory — restarts clear timers.

function checkDepositAmlThreshold(userId: string, amount: number, relatedTxId: string, today: string) {
  if (amount >= CTR_THRESHOLD_TWD) {
    amlStore.appendAlert({
      userId,
      type: 'large_amount',
      severity: 'high',
      description: `單筆入金 NT$${amount.toLocaleString('en-US')}，達 CTR 門檻 (NT$${CTR_THRESHOLD_TWD.toLocaleString('en-US')})`,
      relatedTxId,
      amount,
      resolvedAt: null, resolvedBy: null, resolution: null
    })
    reportStore.createCtrDraft({ userId, amount, txId: relatedTxId, dateIso: today })
    return
  }
  const dailyTotal = traderStore.getDailyDepositTotal(userId, today)
  if (dailyTotal >= CTR_THRESHOLD_TWD) {
    amlStore.appendAlert({
      userId,
      type: 'large_amount',
      severity: 'high',
      description: `當日累積入金達 NT$${dailyTotal.toLocaleString('en-US')}`,
      relatedTxId,
      amount: dailyTotal,
      resolvedAt: null, resolvedBy: null, resolution: null
    })
    reportStore.createCtrDraft({ userId, amount, txId: relatedTxId, dateIso: today })
  }
}

function checkWithdrawAmlThreshold(userId: string, amount: number, relatedTxId: string) {
  if (amount >= CTR_THRESHOLD_TWD) {
    amlStore.appendAlert({
      userId,
      type: 'large_amount',
      severity: 'high',
      description: `單筆出金 NT$${amount.toLocaleString('en-US')}，達 CTR 門檻`,
      relatedTxId,
      amount,
      resolvedAt: null, resolvedBy: null, resolution: null
    })
    reportStore.createCtrDraft({ userId, amount, txId: relatedTxId })
  }
}

export function scheduleFiatDeposit(depositId: string): void {
  setTimeout(() => {
    const deposit = traderStore.findFiatDeposit(depositId)
    if (!deposit || deposit.status !== 'pending') return

    const now = new Date().toISOString()
    traderStore.updateFiatDeposit(depositId, {
      status: 'completed',
      completedAt: now,
      bankReference: `BR${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    })
    traderStore.adjustFiatBalance(deposit.userId, deposit.amount)
    traderStore.appendAudit({
      actor: 'system', actorRole: 'system',
      action: 'fiat.deposit.complete',
      resourceType: 'deposit', resourceId: depositId,
      metadata: { amount: deposit.amount }, ipAddress: null
    })
    checkDepositAmlThreshold(deposit.userId, deposit.amount, depositId, now)
  }, SETTLEMENT_DELAYS.fiatDepositToCompleted)
}

export function scheduleFiatWithdraw(withdrawalId: string): void {
  setTimeout(() => {
    const w = traderStore.findFiatWithdrawal(withdrawalId)
    if (!w || w.status !== 'pending') return
    const now = new Date().toISOString()
    traderStore.updateFiatWithdrawal(withdrawalId, {
      status: 'approved',
      approvedBy: 'mock-reviewer',
      approvedAt: now
    })
    traderStore.appendAudit({
      actor: 'mock-reviewer', actorRole: 'compliance',
      action: 'fiat.withdraw.approve',
      resourceType: 'withdrawal', resourceId: withdrawalId,
      metadata: { amount: w.amount }, ipAddress: null
    })

    setTimeout(() => {
      const w2 = traderStore.findFiatWithdrawal(withdrawalId)
      if (!w2 || w2.status !== 'approved') return
      const now2 = new Date().toISOString()
      traderStore.updateFiatWithdrawal(withdrawalId, {
        status: 'completed',
        completedAt: now2
      })
      traderStore.adjustFiatBalance(w2.userId, -(w2.amount + w2.fee))
      traderStore.appendAudit({
        actor: 'system', actorRole: 'system',
        action: 'fiat.withdraw.complete',
        resourceType: 'withdrawal', resourceId: withdrawalId,
        metadata: { amount: w2.amount, fee: w2.fee }, ipAddress: null
      })
      checkWithdrawAmlThreshold(w2.userId, w2.amount, withdrawalId)
    }, SETTLEMENT_DELAYS.fiatWithdrawApprovedToCompleted)
  }, SETTLEMENT_DELAYS.fiatWithdrawToApproved)
}

export function scheduleCryptoWithdraw(withdrawalId: string): void {
  setTimeout(() => {
    const w = traderStore.findCryptoWithdrawal(withdrawalId)
    if (!w || w.status !== 'pending') return
    const now = new Date().toISOString()
    const txHash = `tx_mock_${Math.random().toString(36).slice(2, 12)}`
    traderStore.updateCryptoWithdrawal(withdrawalId, {
      status: 'completed',
      completedAt: now,
      txHash
    })
    traderStore.adjustHolding(w.userId, w.asset, -(w.amount + w.fee))
    traderStore.appendAudit({
      actor: 'system', actorRole: 'system',
      action: 'crypto.withdraw.complete',
      resourceType: 'crypto_withdrawal', resourceId: withdrawalId,
      metadata: { asset: w.asset, amount: w.amount, fee: w.fee, txHash }, ipAddress: null
    })
  }, SETTLEMENT_DELAYS.cryptoWithdrawToCompleted)
}
