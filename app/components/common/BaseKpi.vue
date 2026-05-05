<script setup lang="ts">
type Tone = 'default' | 'warning' | 'danger' | 'success'
type Theme = 'admin' | 'bank' | 'plain'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  /** 上方小標 */
  label: string
  /** 中間主數值（已格式化的字串） */
  value: string | number
  /** 下方小提示文字（選填） */
  hint?: string
  /** 邊框強調色，狀態為非 default 時加上 border-{tone} */
  tone?: Tone
  /** 視覺主題：admin 用 admin-kpi class（左側 border 強調）、其餘共用 panel */
  theme?: Theme
  /** 內距大小 */
  size?: Size
}>(), {
  tone: 'default',
  theme: 'admin',
  size: 'md'
})

const paddingClass = computed(() => (props.size === 'sm' ? 'p-4' : 'p-5'))

const wrapperClass = computed(() => {
  if (props.theme === 'admin') {
    return 'admin-kpi'
  }
  if (props.theme === 'bank') {
    return `bank-panel ${paddingClass.value}`
  }
  return `bg-surface border border-border rounded ${paddingClass.value}`
})

const toneClass = computed(() => {
  if (props.tone === 'warning') return 'border-warning'
  if (props.tone === 'danger') return 'border-danger'
  if (props.tone === 'success') return 'border-success'
  return ''
})

const valueClass = computed(() => {
  // 統一所有主題使用相同字級 / 字重；色彩由 theme token 自動帶入
  if (props.theme === 'bank') return 'text-xl font-semibold text-primary-900 mt-3 mb-1 num'
  return 'text-xl font-semibold num'
})
</script>

<template>
  <div :class="[wrapperClass, toneClass]">
    <div class="text-xs text-text-muted uppercase tracking-wider mb-2">{{ label }}</div>
    <div :class="valueClass">
      <slot>{{ value }}</slot>
    </div>
    <div v-if="hint || $slots.hint" class="text-xs text-text-muted mt-1">
      <slot name="hint">{{ hint }}</slot>
    </div>
  </div>
</template>
