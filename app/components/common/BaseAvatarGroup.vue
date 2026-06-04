<script setup lang="ts">
// 頭像群組：把 slot 裡的多個 BaseAvatar 疊在一起顯示，超過上限以「+N」收合。

import { cloneVNode, computed, Fragment, h } from 'vue'

import type { Slot, VNode } from 'vue'

import BaseAvatar from './BaseAvatar.vue'
import resolveSlotChildren from './resolveSlotChildren'

interface BaseAvatarGroupProps {
  /** 最多顯示幾個頭像，其餘收合成 +N；最小為 1 */
  max?: number
  /** 共用尺寸，會覆寫子 BaseAvatar 的 size */
  size?: 'small' | 'medium' | 'large' | `${number}` | number
  /** 共用圓角，會覆寫子 BaseAvatar 的 rounded */
  rounded?: `${number}` | number | 'full'
}

interface BaseAvatarGroupSlots {
  default?: () => ReturnType<Slot>
}

const props = withDefaults(defineProps<BaseAvatarGroupProps>(), {
  max: 3,
  size: 'medium',
  rounded: 'full',
})

const slots = defineSlots<BaseAvatarGroupSlots>()

// 取出 slot 內的 BaseAvatar 節點（攤平 Fragment、濾掉註解 / 文字）
const children = computed(() => resolveSlotChildren(slots.default?.()))

const DefaultVNode = computed(() => {
  const nodes = children.value
  if (!nodes) return undefined

  const length = nodes.length
  // 共用 props：用 cloneVNode 注入後會覆寫子節點原本的 size / rounded
  const sharedProps = { size: props.size, rounded: props.rounded }

  // max 邊界保護：NaN 或小於 1 一律當成 1
  let max = Number(props.max)
  if (Number.isNaN(max) || max < 1) max = 1

  // 取前 max 個複製並注入共用 props；reverse 是為了配合 CSS 的 row-reverse 疊放順序
  const cloned: VNode[] = nodes
    .slice(0, max)
    .map(node => cloneVNode(node, sharedProps))
    .reverse()

  // 超出上限 → 在最前面補一顆「+N」頭像（給固定 key，與其他帶 key 的節點一致，利於 diff）
  if (length > max) {
    const ellipsis = h(BaseAvatar, { ...sharedProps, key: 'overflow' }, () => `+${length - max}`)
    cloned.unshift(ellipsis)
  }

  return h(Fragment, cloned)
})
</script>

<template>
  <div class="base-avatar-group">
    <component :is="DefaultVNode" />
  </div>
</template>

<style lang="scss">
.base-avatar-group {
  display: flex;
  // row-reverse 搭配前面的 .reverse()：讓「排在前面」的頭像疊在上層
  flex-direction: row-reverse;
  justify-content: flex-end;
  align-items: center;

  .base-avatar {
    position: relative;
    // 邊框跟著主題走（trader 深色 / bank 淺色都正確），不硬編顏色
    border: 2px solid var(--color-surface);
  }

  // 相鄰頭像互相疊壓，重疊量隨各自尺寸等比（--avatar-size 由 BaseAvatar inline 設定）
  .base-avatar + .base-avatar {
    margin-right: calc(var(--avatar-size) * -0.4);
  }
}
</style>
