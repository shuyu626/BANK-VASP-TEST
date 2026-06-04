import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import BaseAvatarGroup from '~~/app/components/common/BaseAvatarGroup.vue'
import BaseAvatar from '~~/app/components/common/BaseAvatar.vue'

// 掛載一個父層 wrapper，用 reactive 陣列驅動 v-for，方便之後改變 slot 內容
function mountWithNames(initial: string[], max = 3) {
  const names = ref(initial)
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            BaseAvatarGroup,
            { max, size: 'small' },
            { default: () => names.value.map((n) => h(BaseAvatar, { key: n, alt: n }, () => n.charAt(0))) },
          )
      },
    }),
  )
  return { wrapper, names }
}

describe('BaseAvatarGroup', () => {
  it('renders up to `max` avatars plus a +N overflow chip', () => {
    const { wrapper } = mountWithNames(['Amy', 'Bob', 'Cara', 'Dan', 'Eve'], 3)
    const avatars = wrapper.findAllComponents(BaseAvatar)
    // 3 顆 + 1 顆溢出 = 4
    expect(avatars).toHaveLength(4)
    expect(wrapper.text()).toContain('+2')
  })

  it('shows no overflow chip when count is within `max`', () => {
    const { wrapper } = mountWithNames(['Amy', 'Bob'], 3)
    expect(wrapper.findAllComponents(BaseAvatar)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('+')
  })

  // 核心回歸測試：slot 內容變動時，群組必須跟著更新（驗證沒有 computed-over-slots 過時問題）
  it('reacts to reactive slot changes', async () => {
    const { wrapper, names } = mountWithNames(['Amy', 'Bob', 'Cara', 'Dan', 'Eve'], 3)
    expect(wrapper.findAllComponents(BaseAvatar)).toHaveLength(4) // 3 + 「+2」
    expect(wrapper.text()).toContain('+2')

    names.value = ['Amy', 'Bob']
    await wrapper.vm.$nextTick()

    expect(wrapper.findAllComponents(BaseAvatar)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('+')
  })

  it('clamps invalid max (< 1 or NaN) to 1', () => {
    const { wrapper } = mountWithNames(['Amy', 'Bob', 'Cara'], 0)
    // max 夾成 1 → 1 顆 + 「+2」= 2 顆
    expect(wrapper.findAllComponents(BaseAvatar)).toHaveLength(2)
    expect(wrapper.text()).toContain('+2')
  })
})
