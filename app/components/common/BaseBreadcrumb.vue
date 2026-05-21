<script setup lang="ts">
import { resolveComponent } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface BreadcrumbItem {
  /** 顯示文字；iconOnly 模式下仍會以 sr-only 提供給螢幕閱讀器 */
  label: string
  /** 路由目標；未提供則純文字呈現（不可點擊） */
  to?: RouteLocationRaw
  /** lucide icon 名稱，例：'lucide:home' */
  icon?: string
  /** 是否只顯示 icon（label 仍以 sr-only 保留） */
  iconOnly?: boolean
}

const props = withDefaults(defineProps<{
  items: BreadcrumbItem[]
  /** 分隔符 lucide icon 名稱；可改用 #separator slot 完全自訂 */
  separator?: string
  /** 自訂 aria-label，預設使用 i18n 翻譯 */
  ariaLabel?: string
}>(), {
  separator: 'lucide:chevron-right',
})

// 與 BaseButton 一致：用 resolveComponent 拿到真正的 NuxtLink reference，
// 避免 <component :is="'NuxtLink'"> 字串解析在 SSR 邊界出問題。
const NuxtLinkComp = resolveComponent('NuxtLink')

const { t } = useI18n()

const navLabel = computed(() => props.ariaLabel ?? t('components.breadcrumb.aria.nav'))

// 最後一個 item 視為「當前頁」：永遠以 <span> 呈現並標記 aria-current="page"，
// 即使呼叫端有傳 to 也忽略 — 符合 W3C APG breadcrumb pattern。
function isCurrent(index: number) {
  return index === props.items.length - 1
}
</script>

<template>
  <nav :aria-label="navLabel" class="text-sm text-text-muted">
    <ol class="flex items-center flex-wrap gap-1.5 list-none p-0 m-0">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="inline-flex items-center gap-1.5"
      >
        <span
          v-if="isCurrent(index) || item.to === undefined"
          class="inline-flex items-center gap-1"
          :class="isCurrent(index) ? 'text-text font-medium' : ''"
          :aria-current="isCurrent(index) ? 'page' : undefined"
        >
          <slot name="item" :item="item" :index="index" :is-current="isCurrent(index)">
            <Icon v-if="item.icon" :name="item.icon" size="14" aria-hidden="true" />
            <span :class="item.icon && item.iconOnly ? 'sr-only' : ''">
              {{ item.label }}
            </span>
          </slot>
        </span>

        <component
          :is="NuxtLinkComp"
          v-else
          :to="item.to"
          class="inline-flex items-center gap-1 rounded transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
        >
          <slot name="item" :item="item" :index="index" :is-current="false">
            <Icon v-if="item.icon" :name="item.icon" size="14" aria-hidden="true" />
            <span :class="item.icon && item.iconOnly ? 'sr-only' : ''">
              {{ item.label }}
            </span>
          </slot>
        </component>

        <span
          v-if="!isCurrent(index)"
          aria-hidden="true"
          class="inline-flex items-center text-text-muted/60 select-none"
        >
          <slot name="separator">
            <Icon :name="separator" size="14" />
          </slot>
        </span>
      </li>
    </ol>
  </nav>
</template>
