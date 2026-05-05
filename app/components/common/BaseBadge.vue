<script setup lang="ts">
type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'
type Size = 'xs' | 'sm'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  /** true = 實心底色 + 白字，false = 半透明底色 + 同色文字 */
  solid?: boolean
}>(), {
  variant: 'neutral',
  size: 'xs',
  solid: true
})

const sizeClass = computed(() =>
  props.size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'
)

const variantClass = computed(() => {
  if (props.solid) {
    return {
      success: 'bg-success text-white',
      warning: 'bg-warning text-white',
      danger: 'bg-danger text-white',
      info: 'bg-info text-white',
      brand: 'bg-primary-500 text-white',
      neutral: 'bg-neutral-300 text-neutral-700'
    }[props.variant]
  }
  return {
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    info: 'bg-info/20 text-info',
    brand: 'bg-primary-500/20 text-primary-400',
    neutral: 'bg-neutral-500/20 text-text-muted'
  }[props.variant]
})
</script>

<template>
  <span
    class="inline-block uppercase tracking-wider rounded-sm font-medium"
    :class="[sizeClass, variantClass]"
  >
    <slot />
  </span>
</template>
