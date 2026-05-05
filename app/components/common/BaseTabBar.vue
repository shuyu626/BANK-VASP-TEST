<script setup lang="ts" generic="T extends string | number">
interface TabOption {
  value: T
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: T
  options: TabOption[]
  /** trader 圓角風格 vs admin 直角風格 */
  rounded?: 'md' | 'sm'
}>(), {
  rounded: 'sm'
})

defineEmits<{
  'update:modelValue': [value: T]
}>()

const radiusClass = computed(() => props.rounded === 'md' ? 'rounded-md' : 'rounded')
</script>

<template>
  <div class="flex gap-1 text-sm">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="px-4 py-2 transition"
      :class="[
        radiusClass,
        modelValue === opt.value
          ? 'bg-brand text-white'
          : 'text-text-muted hover:text-text hover:bg-surface-alt'
      ]"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
