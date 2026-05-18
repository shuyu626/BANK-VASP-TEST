<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: string
  series: number[]
  delta?: { dir: 'up' | 'down' | 'flat'; text: string }
  tone?: 'brand' | 'neutral'
}>(), {
  tone: 'brand'
})

const W = 100
const H = 32

const hasChart = computed(() => props.series.length >= 2)

const points = computed(() => {
  const s = props.series
  const min = Math.min(...s)
  const max = Math.max(...s)
  const span = max - min || 1
  return s.map((v, i) => {
    const x = (i / (s.length - 1)) * W
    const y = H - ((v - min) / span) * (H - 4) - 2
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  })
})

const linePath = computed(() => `M ${points.value.join(' L ')}`)
const areaPath = computed(() => `${linePath.value} L ${W} ${H} L 0 ${H} Z`)

const stroke = computed(() =>
  props.tone === 'brand' ? 'var(--color-primary-400)' : 'var(--color-text-muted)'
)
const deltaClass = computed(() => {
  if (!props.delta || props.delta.dir === 'flat') return 'text-text-muted'
  return props.delta.dir === 'up' ? 'text-primary-400' : 'text-text-muted'
})
</script>

<template>
  <div class="relative overflow-hidden bg-surface border border-border rounded-md p-4 h-28">
    <div class="flex items-center justify-between">
      <span class="text-xs text-text-muted">{{ label }}</span>
      <span v-if="delta" class="text-xs font-semibold num" :class="deltaClass">
        {{ delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '' }} {{ delta.text }}
      </span>
    </div>
    <div class="text-xl font-bold mt-3 num tracking-tight">{{ value }}</div>
    <svg
      v-if="hasChart"
      class="absolute left-0 right-0 bottom-0 w-full h-9"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="areaPath" :fill="stroke" fill-opacity="0.12" />
      <path :d="linePath" fill="none" :stroke="stroke" stroke-width="2"
            vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>
