<script setup lang="ts">
type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local'

const props = withDefaults(defineProps<{
  modelValue: string | number | null | undefined
  type?: InputType
  label?: string
  hint?: string
  /** 有值即顯示為錯誤狀態，並覆蓋 hint */
  error?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  autocomplete?: string
  inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search'
  maxlength?: number
  minlength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  size?: 'sm' | 'md' | 'lg'
  /** 撐滿父層寬度，預設 true */
  block?: boolean
  /** 自訂 input id，未提供時自動生成 */
  id?: string
  /** 額外套到 input 的 class（如 num、tracking-wider） */
  inputClass?: string
}>(), {
  type: 'text',
  size: 'md',
  block: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const uid = useId()
const inputId = computed(() => props.id ?? `app-input-${uid}`)
const hasError = computed(() => !!props.error)

const sizeClass = computed(() => ({
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-3.5 py-2.5'
}[props.size]))

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value
  // type=number 時轉回 number / null，避免父層需要再加 .number 修飾子
  if (props.type === 'number') {
    if (raw === '') {
      emit('update:modelValue', null)
    } else {
      const n = Number(raw)
      emit('update:modelValue', Number.isNaN(n) ? raw : n)
    }
    return
  }
  emit('update:modelValue', raw)
}
</script>

<template>
  <div :class="block ? 'w-full' : 'inline-block'">
    <label v-if="label" :for="inputId" class="block text-xs text-text-muted mb-1">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>

    <div class="relative flex items-center">
      <span v-if="$slots.prefix" class="absolute left-2.5 flex items-center text-text-muted pointer-events-none">
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :minlength="minlength"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="hasError || undefined"
        :aria-describedby="hint || error ? `${inputId}-hint` : undefined"
        class="w-full rounded-md bg-surface-alt border focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        :class="[
          sizeClass,
          hasError ? 'border-danger focus:border-danger' : 'border-border focus:border-primary-500',
          $slots.prefix ? 'pl-8' : '',
          $slots.suffix ? 'pr-8' : '',
          inputClass
        ]"
        @input="onInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      >

      <span v-if="$slots.suffix" class="absolute right-2.5 flex items-center text-text-muted">
        <slot name="suffix" />
      </span>
    </div>

    <p
      v-if="error || hint"
      :id="`${inputId}-hint`"
      class="mt-1 text-xs"
      :class="hasError ? 'text-danger' : 'text-text-muted'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
