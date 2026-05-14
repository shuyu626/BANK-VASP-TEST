<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
useHead(() => ({ title: t('hub.headTitle') }))

interface EndpointCard {
  id: 'trader' | 'admin' | 'bank'
  subtitle: string
  to: string
  tagline: string
}

const ACCENT_BG: Record<EndpointCard['id'], string> = {
  trader: 'bg-primary-500',
  admin:  'bg-primary-700',
  bank:   'bg-primary-900'
}
const ACCENT_TEXT: Record<EndpointCard['id'], string> = {
  trader: 'text-primary-500',
  admin:  'text-primary-700',
  bank:   'text-primary-900'
}

const endpoints = computed<EndpointCard[]>(() => [
  {
    id: 'trader',
    subtitle: 'Trader — End User',
    to: '/trader',
    tagline: 'Dark · Energetic · Real-time'
  },
  {
    id: 'admin',
    subtitle: 'Admin — Exchange Ops & Compliance',
    to: '/admin',
    tagline: 'Light · Neutral · Professional'
  },
  {
    id: 'bank',
    subtitle: 'Bank Back Office',
    to: '/bank',
    tagline: 'Conservative · Serif · Auditable'
  }
])
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-16">
    <div class="flex justify-end mb-4">
      <BaseLangSwitch />
    </div>
    <header class="text-center mb-16">
      <div class="inline-block text-xs tracking-[0.3em] text-primary-700 font-medium mb-4 uppercase">
        Taiwan VASP × Bank Partnership
      </div>
      <h1 class="text-4xl md:text-5xl font-bold mb-4 text-neutral-900">
        {{ $t('hub.heroLine1') }}
        <span class="block text-primary-700 mt-2">{{ $t('hub.heroLine2') }}</span>
      </h1>
      <p class="text-text-muted max-w-2xl mx-auto leading-relaxed">
        {{ $t('hub.heroDesc') }}
      </p>
    </header>

    <div class="grid md:grid-cols-3 gap-6">
      <NuxtLink
        v-for="ep in endpoints"
        :key="ep.id"
        :to="ep.to"
        class="group relative bg-surface border border-border rounded-lg p-6 hover:shadow-lg transition hover:-translate-y-0.5"
      >
        <div class="absolute inset-x-0 top-0 h-1 rounded-t-lg" :class="ACCENT_BG[ep.id]" />

        <div class="text-xs tracking-widest uppercase text-text-muted mb-2">
          {{ ep.subtitle }}
        </div>
        <h2 class="text-xl font-bold mb-3" :class="ACCENT_TEXT[ep.id]">
          {{ $t(`hub.${ep.id}.title`) }}
        </h2>
        <p class="text-sm text-text leading-relaxed mb-6">
          {{ $t(`hub.${ep.id}.description`) }}
        </p>
        <div class="flex items-center justify-between pt-4 border-t border-border">
          <span class="text-[11px] tracking-wider text-text-muted uppercase">
            {{ ep.tagline }}
          </span>
          <span class="text-sm font-medium group-hover:translate-x-1 transition" :class="ACCENT_TEXT[ep.id]">
            {{ $t(`hub.${ep.id}.cta`) }} →
          </span>
        </div>
      </NuxtLink>
    </div>

    <section class="mt-16 bg-surface-alt border border-border rounded-lg p-6 text-sm">
      <h3 class="font-semibold mb-3 text-primary-900">{{ $t('hub.aboutTitle') }}</h3>
      <ul class="space-y-2 text-text-muted leading-relaxed list-disc pl-5">
        <li>{{ $t('hub.aboutBullets.law') }}</li>
        <li>{{ $t('hub.aboutBullets.mock') }}</li>
        <li>
          <i18n-t keypath="hub.aboutBullets.stack" tag="span" scope="global">
            <template #code><code class="bg-surface px-1 rounded text-xs">data-theme</code></template>
          </i18n-t>
        </li>
        <li>
          <i18n-t keypath="hub.aboutBullets.color" tag="span" scope="global">
            <template #primary><code class="bg-surface px-1 rounded text-xs">#00403e</code></template>
            <template #accent><code class="bg-surface px-1 rounded text-xs">#00a19c</code></template>
          </i18n-t>
        </li>
      </ul>
    </section>
  </div>
</template>
