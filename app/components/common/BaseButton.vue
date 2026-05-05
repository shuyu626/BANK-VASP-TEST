<script setup lang="ts">
import { resolveComponent } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  /** 撐滿父層寬度 */
  block?: boolean
  /** loading 狀態：顯示 spinner 並 disabled */
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** 提供 to 時改用 NuxtLink；提供 href 時改用 <a> */
  to?: RouteLocationRaw
  href?: string
  /** a tag 才會生效 */
  target?: string
  rel?: string
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

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

const sizeClass = computed(() => ({
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2'
}[props.size]))

const variantClass = computed(() => ({
  primary: 'app-btn--primary bg-brand text-white border border-transparent hover:opacity-90',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-alt',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-alt border border-transparent',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90',
  link: 'bg-transparent text-brand hover:underline px-0 py-0 border-0'
}[props.variant]))

function onClick(e: MouseEvent) {
  if (isDisabled.value) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  emit('click', e)
}
</script>

<template>
  <component
    :is="tag"
    :to="props.to"
    :href="props.href"
    :target="props.href ? target : undefined"
    :rel="props.href ? rel : undefined"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : isDisabled"
    :aria-disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    class="app-btn inline-flex items-center justify-center font-medium rounded-md transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[
      variantClass,
      variant !== 'link' ? sizeClass : '',
      block ? 'w-full' : '',
      isDisabled ? 'pointer-events-none' : ''
    ]"
    @click="onClick"
  >
    <span v-if="loading" class="app-btn__spinner" aria-hidden="true" />
    <slot v-if="$slots.prefix" name="prefix" />
    <slot />
    <slot v-if="$slots.suffix" name="suffix" />
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
