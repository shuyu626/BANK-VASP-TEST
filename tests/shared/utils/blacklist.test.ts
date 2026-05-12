import { describe, it, expect } from 'vitest'
import { checkBlacklist, BLACKLIST_DEMO_HINT } from '~~/shared/utils/blacklist'

describe('checkBlacklist', () => {
  it('returns hit:false for empty or too-short input', () => {
    expect(checkBlacklist('')).toEqual({ hit: false })
    expect(checkBlacklist('abc')).toEqual({ hit: false })
  })

  it('returns hit:false for clean addresses', () => {
    expect(checkBlacklist('bc1qclean000000000000').hit).toBe(false)
    expect(checkBlacklist('0x1234567890abcdef').hit).toBe(false)
  })

  it('matches the BLACKLIST demo hint case-insensitively', () => {
    const m = checkBlacklist(`some-address-${BLACKLIST_DEMO_HINT}`)
    expect(m.hit).toBe(true)
    expect(m.source).toBe('demo')
    expect(m.reason).toContain('Demo')
  })

  it('matches lowercase variants of patterns', () => {
    const m = checkBlacklist(`prefix${BLACKLIST_DEMO_HINT.toLowerCase()}suffix`)
    expect(m.hit).toBe(true)
  })

  it('matches the BTC OFAC pattern as substring', () => {
    expect(checkBlacklist('xx1MZQHMNg7yWdJSh43oBxWpfVQfzPwaA6Vhxx').hit).toBe(true)
  })

  it('attaches source label when matched', () => {
    const m = checkBlacklist('aaaTXBLACKLISTbbb')
    expect(m.hit).toBe(true)
    expect(m.source).toBe('TRM')
  })

  it('first matching entry wins (deterministic order)', () => {
    // 同時包含 OFAC pattern 與 demo hint 時，應命中先註冊的
    const m = checkBlacklist('bc1q9rdf-also-has-BLACKLIST-substr')
    expect(m.hit).toBe(true)
    expect(m.source).toBe('OFAC')
  })
})
