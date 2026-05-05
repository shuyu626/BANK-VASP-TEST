<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  /** 'semibold' = admin 風格、'bold' = trader 風格 */
  weight?: 'semibold' | 'bold'
}>(), {
  weight: 'semibold'
})

const slots = useSlots()
</script>

<template>
  <header class="flex items-start justify-between gap-4 flex-wrap">
    <div class="min-w-0">
      <h1
        class="text-2xl text-text"
        :class="weight === 'bold' ? 'font-bold' : 'font-semibold'"
      >
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-sm text-text-muted mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
