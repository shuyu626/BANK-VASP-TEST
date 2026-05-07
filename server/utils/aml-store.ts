import type { AmlAlert } from '~~/shared/types'
import { mockAmlAlerts } from '~~/app/utils/mock/compliance'
import { CTR_THRESHOLD_TWD } from '~~/shared/types/transfer-fees'

// AML alerts — written by the settlement engine and Day 6+ admin flows,
// consumed by Day 7 (admin risk) and Day 9 (bank SAR) UIs.
// Separate module so trader-store doesn't balloon with compliance concerns.

let initialized = false
const alerts: AmlAlert[] = []

function ensureSeeded() {
  if (initialized) return
  initialized = true
  for (const a of mockAmlAlerts) {
    alerts.push({ ...a })
  }
}

export const amlStore = {
  list(): AmlAlert[] {
    ensureSeeded()
    return alerts
  },

  listOpen(): AmlAlert[] {
    ensureSeeded()
    return alerts.filter(a => !a.resolvedAt)
  },

  listByUser(userId: string): AmlAlert[] {
    ensureSeeded()
    return alerts.filter(a => a.userId === userId)
  },

  findById(id: string): AmlAlert | undefined {
    ensureSeeded()
    return alerts.find(a => a.id === id)
  },

  appendAlert(alert: Omit<AmlAlert, 'id' | 'createdAt'>): AmlAlert {
    ensureSeeded()
    const full: AmlAlert = {
      id: `aml_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      ...alert
    }
    alerts.push(full)
    return full
  },

  resolveAlert(id: string, resolution: AmlAlert['resolution'], by: string): AmlAlert | undefined {
    ensureSeeded()
    const alert = alerts.find(a => a.id === id)
    if (!alert) return undefined
    alert.resolvedAt = new Date().toISOString()
    alert.resolvedBy = by
    alert.resolution = resolution
    return alert
  }
}

