import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BaseAvatar from '~~/app/components/common/BaseAvatar.vue'

describe('BaseAvatar', () => {
  it('renders default slot (initials) when no src is given', () => {
    const wrapper = mount(BaseAvatar, { slots: { default: '王' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('王')
  })

  it('renders an <img> with intrinsic width/height when src is given', () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/a.png', alt: 'Amy', size: 'large' } })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('Amy')
    // large → 56px，同時寫進 width / height 避免 CLS
    expect(img.attributes('width')).toBe('56')
    expect(img.attributes('height')).toBe('56')
  })

  it('falls back to alt text when the image fails to load', async () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/broken.png', alt: 'Bob' } })
    expect(wrapper.find('img').exists()).toBe(true)

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('Bob')
  })

  it('prefers the fallback slot over alt text on error', async () => {
    const wrapper = mount(BaseAvatar, {
      props: { src: '/broken.png', alt: 'Bob' },
      slots: { fallback: 'FB' },
    })
    await wrapper.find('img').trigger('error')
    expect(wrapper.text()).toBe('FB')
  })

  it('detects an already-loaded broken image (complete + naturalWidth 0) and shows fallback', async () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/cached.png', alt: 'Bob' } })
    const el = wrapper.find('img').element
    // 模擬「已快取的壞圖」：load/error 事件早就發生過、不會再補觸發
    Object.defineProperty(el, 'complete', { value: true, configurable: true })
    Object.defineProperty(el, 'naturalWidth', { value: 0, configurable: true })

    // 換 src 會觸發 watch → nextTick(syncCachedError) 補檢查
    await wrapper.setProps({ src: '/cached-2.png' })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('Bob')
  })

  it('keeps showing the image when it loaded successfully (naturalWidth > 0)', async () => {
    const wrapper = mount(BaseAvatar, { props: { src: '/ok.png', alt: 'Amy' } })
    const el = wrapper.find('img').element
    Object.defineProperty(el, 'complete', { value: true, configurable: true })
    Object.defineProperty(el, 'naturalWidth', { value: 48, configurable: true })

    await wrapper.setProps({ src: '/ok-2.png' })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('resolves numeric size into the --avatar-size CSS variable', () => {
    const wrapper = mount(BaseAvatar, { props: { size: 64 }, slots: { default: 'X' } })
    expect(wrapper.attributes('style')).toContain('--avatar-size: 64px')
  })

  it('exposes alt as an aria-label on the initials fallback (a11y)', () => {
    const wrapper = mount(BaseAvatar, { props: { alt: '王小明' }, slots: { default: '王' } })
    const root = wrapper.find('span.base-avatar > span')
    expect(root.attributes('role')).toBe('img')
    expect(root.attributes('aria-label')).toBe('王小明')
  })
})
