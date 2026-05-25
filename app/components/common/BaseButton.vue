<script lang="ts">
import type { RouteLocationRaw } from 'vue-router'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type ButtonTone = 'danger' | 'warning' | 'success'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 撐滿父層寬度 */
  block?: boolean
  /**
   * 強制方形版型（min-width = height），padding 縮小。
   * 用於 icon-only、單字元（如分頁頁碼）等需要等寬等高的場景。
   * 對應 `docs/component/button.md` 的 `shape="square"`。
   */
  square?: boolean
  /** loading 狀態：顯示 spinner 並 disabled */
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** 提供 to 時改用 NuxtLink；提供 href 時改用 <a> */
  to?: RouteLocationRaw
  href?: string
  /** a tag 才會生效。target="_blank" 時自動補 rel="noopener noreferrer" */
  target?: string
  rel?: string
  /**
   * 覆寫 variant 預設顏色，保留視覺結構：
   * primary 染 bg、secondary/ghost/link 染 text。
   * 用於灰底紅字、黃色 CTA 等 variant 表達不出的語意搭配。
   */
  tone?: ButtonTone
}
</script>

<script setup lang="ts">
import { resolveComponent } from 'vue'

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  type: 'button'
})

// NuxtLink 是 Nuxt 全域註冊元件，但 <component :is="'NuxtLink'"> 字串解析在某些情境不可靠，
// 改成 resolveComponent 拿到真正的元件 reference 才能保證渲染為 <a> 而非無效標籤。
const NuxtLinkComp = resolveComponent('NuxtLink')

const isDisabled = computed(() => props.disabled || props.loading)

const tag = computed(() => {
  if (props.to !== undefined) return NuxtLinkComp
  if (props.href !== undefined) return 'a'
  return 'button'
})
const isLink = computed(() => props.to !== undefined || props.href !== undefined)

// target="_blank" 沒顯式 rel 時補上 noopener noreferrer，防 window.opener 釣魚
const computedRel = computed(() => {
  if (!props.href) return undefined
  if (props.rel !== undefined) return props.rel
  if (props.target === '_blank') return 'noopener noreferrer'
  return undefined
})

// square 模式：min-w = h，px 縮小、捨棄 py（高度由 h-X 鎖定），用於 icon-only / 單字元按鈕。
// 非 square：依文字段落自然撐開，px / py 配對行內排版。
const sizeClass = computed(() => {
  if (props.square) {
    return {
      xs: 'text-xs min-w-7 h-7 px-1.5',
      sm: 'text-xs min-w-8 h-8 px-2',
      md: 'text-sm min-w-10 h-10 px-2',
      lg: 'text-base min-w-12 h-12 px-3',
    }[props.size]
  }
  return {
    xs: 'text-xs px-2 py-1',
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  }[props.size]
})

const sizeGapClass = computed(() => ({
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2',
}[props.size]))

const TONE_BG: Record<ButtonTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  success: 'bg-success'
}
const TONE_TEXT: Record<ButtonTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success'
}

const variantClass = computed(() => {
  const t = props.tone
  switch (props.variant) {
    case 'primary':
      return `app-btn--primary ${t ? TONE_BG[t] : 'bg-brand'} text-white border border-transparent hover:opacity-90`
    case 'secondary':
      return `bg-surface ${t ? TONE_TEXT[t] : 'text-text'} border border-border hover:bg-surface-alt`
    case 'ghost':
      return `bg-transparent ${t ? TONE_TEXT[t] : 'text-text-muted hover:text-text'} hover:bg-surface-alt border border-transparent`
    case 'danger':
      return 'bg-danger text-white border border-transparent hover:opacity-90'
    case 'link':
      return `bg-transparent ${t ? TONE_TEXT[t] : 'text-brand'} hover:underline px-0 py-0 border-0`
  }
})

// 不 emit 'click'；caller 的 @click 透過 attrs fallthrough 自動掛到 root。
// onClick 只負責 disabled/loading 時阻擋（含同元素其他 listener，例如父層 @click）。
function onClick(e: MouseEvent) {
  if (isDisabled.value) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}
</script>

<template>
  <component
    :is="tag"
    :to="props.to"
    :href="props.href"
    :target="props.href ? target : undefined"
    :rel="computedRel"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : isDisabled"
    :tabindex="isLink && isDisabled ? -1 : undefined"
    :aria-disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    class="app-btn relative inline-flex items-center justify-center font-medium rounded-md transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      variantClass,
      variant !== 'link' ? sizeClass : '',
      block ? 'w-full' : '',
      isDisabled ? 'pointer-events-none' : ''
    ]"
    @click="onClick"
  >
    <span
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <span class="app-btn__spinner" />
    </span>
    <span
      class="inline-flex items-center"
      :class="[variant !== 'link' ? sizeGapClass : '', loading ? 'invisible' : '']"
    >
      <slot v-if="$slots.prefix" name="prefix" />
      <slot />
      <slot v-if="$slots.suffix" name="suffix" />
    </span>
  </component>
</template>

<style scoped lang="scss">
.app-btn__spinner {
  width: 0.875em;
  height: 0.875em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 9999px;
  animation: app-btn-spin 0.7s linear infinite;
}

@keyframes app-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
