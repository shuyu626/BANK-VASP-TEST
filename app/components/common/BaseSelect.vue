<script setup lang="ts" generic="T extends string | number">
interface SelectOption {
  value: T
  label: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: T | null | undefined
  options: SelectOption[]
  label?: string
  hint?: string
  error?: string
  /** 顯示在最前面的占位 option（value 為空字串） */
  placeholder?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  id?: string
}>(), {
  size: 'md',
  block: true
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const uid = useId()
const selectId = computed(() => props.id ?? `app-select-${uid}`)
const hasError = computed(() => !!props.error)

const sizeClass = computed(() => ({
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-3.5 py-2.5'
}[props.size]))

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const raw = target.value
  // 推回原型別：第一個選項是 number 就轉成 number
  const isNumeric = props.options.length > 0 && typeof props.options[0]!.value === 'number'
  emit('update:modelValue', (isNumeric ? Number(raw) : raw) as T)
}
</script>

<template>
  <div :class="block ? 'w-full' : 'inline-block'">
    <label v-if="label" :for="selectId" class="block text-xs text-text-muted mb-1">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>

    <select
      :id="selectId"
      :value="modelValue ?? ''"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError || undefined"
      :aria-describedby="hint || error ? `${selectId}-hint` : undefined"
      class="w-full rounded-md bg-surface-alt border focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
      :class="[
        sizeClass,
        hasError ? 'border-danger focus:border-danger' : 'border-border focus:border-primary-500'
      ]"
      @change="onChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="String(opt.value)"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        {{ opt.label }}
      </option>
    </select>

    <p
      v-if="error || hint"
      :id="`${selectId}-hint`"
      class="mt-1 text-xs"
      :class="hasError ? 'text-danger' : 'text-text-muted'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
