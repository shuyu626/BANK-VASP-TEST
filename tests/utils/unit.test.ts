import { describe, expect, it } from 'vitest'
import { isNumberish, toUnit } from '~~/app/utils/unit'

describe('isNumberish', () => {
  it('treats finite numbers as numberish', () => {
    expect(isNumberish(0)).toBe(true)
    expect(isNumberish(40)).toBe(true)
    expect(isNumberish(-8)).toBe(true)
    expect(isNumberish(3.14)).toBe(true)
  })

  it('treats numeric strings as numberish', () => {
    expect(isNumberish('40')).toBe(true)
    expect(isNumberish('0')).toBe(true)
    expect(isNumberish('3.14')).toBe(true)
  })

  it('rejects non-numeric strings', () => {
    expect(isNumberish('medium')).toBe(false)
    expect(isNumberish('full')).toBe(false)
    expect(isNumberish('40px')).toBe(false)
  })

  it('rejects empty / whitespace-only strings', () => {
    expect(isNumberish('')).toBe(false)
    expect(isNumberish('   ')).toBe(false)
  })

  it('rejects NaN and non-primitive values', () => {
    expect(isNumberish(NaN)).toBe(false)
    expect(isNumberish(null)).toBe(false)
    expect(isNumberish(undefined)).toBe(false)
    expect(isNumberish({})).toBe(false)
  })
})

describe('toUnit', () => {
  it('appends px to bare numbers and numeric strings', () => {
    expect(toUnit(8)).toBe('8px')
    expect(toUnit('8')).toBe('8px')
    expect(toUnit(0)).toBe('0px')
  })

  it('honours a custom unit', () => {
    expect(toUnit(1, 'rem')).toBe('1rem')
    expect(toUnit('100', '%')).toBe('100%')
  })

  it('returns non-numeric values unchanged', () => {
    expect(toUnit('8px')).toBe('8px')
    expect(toUnit('full')).toBe('full')
  })
})
