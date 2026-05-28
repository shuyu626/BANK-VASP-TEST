import { describe, it, expect, beforeEach } from 'vitest'
import { usePopupStack, __resetPopupStack } from '~~/app/composables/usePopupStack'

describe('usePopupStack', () => {
  beforeEach(() => {
    __resetPopupStack()
    // Simulate a viewport with a 24px scrollbar gutter.
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1000, configurable: true })
  })

  it('register returns unique ascending ids', () => {
    const { register } = usePopupStack()
    const a = register()
    const b = register()
    expect(a).toBeLessThan(b)
  })

  it('isTop reflects the last registered popup', () => {
    const { register, isTop } = usePopupStack()
    const a = register()
    expect(isTop(a)).toBe(true)
    const b = register()
    expect(isTop(a)).toBe(false)
    expect(isTop(b)).toBe(true)
  })

  it('unregister restores the previous top', () => {
    const { register, unregister, isTop } = usePopupStack()
    const a = register()
    const b = register()
    unregister(b)
    expect(isTop(a)).toBe(true)
  })

  it('locks body and compensates scrollbar gutter on first register', () => {
    const { register } = usePopupStack()
    register()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('24px')
  })

  it('keeps body locked while any popup is open', () => {
    const { register, unregister } = usePopupStack()
    const a = register()
    const b = register()
    unregister(b)
    expect(document.body.style.overflow).toBe('hidden')
    unregister(a)
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.paddingRight).toBe('')
  })

  it('unregistering a stale id is a no-op', () => {
    const { register, unregister, isTop } = usePopupStack()
    const a = register()
    unregister(9999)
    expect(isTop(a)).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('skips scrollbar padding when there is no gutter', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1024, configurable: true })
    const { register } = usePopupStack()
    register()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('')
  })
})
