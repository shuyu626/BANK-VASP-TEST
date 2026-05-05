<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  rows?: number
  maxlength?: number
  /** 撐滿父層寬度，預設 true */
  block?: boolean
  /** 顯示「目前字數 / maxlength」counter */
  showCounter?: boolean
  id?: string
}>(), {
  rows: 4,
  block: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uid = useId()
const taId = computed(() => props.id ?? `app-textarea-${uid}`)
const hasError = computed(() => !!props.error)
const length = computed(() => (props.modelValue ?? '').length)

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div :class="block ? 'w-full' : 'inline-block'">
    <div v-if="label || (showCounter && maxlength)" class="flex items-baseline justify-between mb-1">
      <label v-if="label" :for="taId" class="block text-xs text-text-muted">
        {{ label }}
        <span v-if="required" class="text-danger" aria-hidden="true">*</span>
      </label>
      <span v-if="showCounter && maxlength" class="text-xs text-text-muted num">
        {{ length }} / {{ maxlength }}
      </span>
    </div>

    <textarea
      :id="taId"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :maxlength="maxlength"
      :aria-invalid="hasError || undefined"
      :aria-describedby="hint || error ? `${taId}-hint` : undefined"
      class="w-full rounded-md bg-surface-alt border text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition resize-y"
      :class="hasError ? 'border-danger focus:border-danger' : 'border-border focus:border-primary-500'"
      @input="onInput"
    />

    <p
      v-if="error || hint"
      :id="`${taId}-hint`"
      class="mt-1 text-xs"
      :class="hasError ? 'text-danger' : 'text-text-muted'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
