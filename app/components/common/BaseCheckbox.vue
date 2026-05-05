<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  label?: string
  hint?: string
  disabled?: boolean
  /** 對齊方式：label 在右側（預設）或左側 */
  align?: 'left' | 'right'
  id?: string
}>(), {
  align: 'right'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const uid = useId()
const cbId = computed(() => props.id ?? `app-checkbox-${uid}`)

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label
    :for="cbId"
    class="inline-flex items-center gap-2 text-sm cursor-pointer select-none"
    :class="[
      align === 'left' ? 'flex-row-reverse justify-end' : '',
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    ]"
  >
    <input
      :id="cbId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="accent-primary-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
      @change="onChange"
    >
    <span v-if="label || $slots.default" class="text-text">
      <slot>{{ label }}</slot>
      <span v-if="hint" class="block text-xs text-text-muted">{{ hint }}</span>
    </span>
  </label>
</template>
