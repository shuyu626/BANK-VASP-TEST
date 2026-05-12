import { describe, it, expect } from 'vitest'
import { createSeededRandom, hashSeed } from '~~/app/utils/mock/seed'

describe('createSeededRandom', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = createSeededRandom(42)
    const b = createSeededRandom(42)
    const aSeq = Array.from({ length: 10 }, () => a())
    const bSeq = Array.from({ length: 10 }, () => b())
    expect(aSeq).toEqual(bSeq)
  })

  it('different seeds yield different sequences', () => {
    const a = createSeededRandom(1)
    const b = createSeededRandom(2)
    const aFirst = a()
    const bFirst = b()
    expect(aFirst).not.toBe(bFirst)
  })

  it('returns values in [0, 1)', () => {
    const r = createSeededRandom(123)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashSeed', () => {
  it('returns a non-negative integer', () => {
    expect(hashSeed('hello')).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(hashSeed('hello'))).toBe(true)
  })

  it('returns 0 for empty string', () => {
    expect(hashSeed('')).toBe(0)
  })

  it('produces stable output for the same input', () => {
    expect(hashSeed('BTC-TWD')).toBe(hashSeed('BTC-TWD'))
  })

  it('typically distinguishes different inputs', () => {
    expect(hashSeed('alice')).not.toBe(hashSeed('bob'))
    expect(hashSeed('BTC-TWD')).not.toBe(hashSeed('ETH-TWD'))
  })
})
