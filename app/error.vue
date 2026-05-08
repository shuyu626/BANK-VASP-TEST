<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const route = useRoute()

type Section = 'trader' | 'admin' | 'bank' | 'hub'

// error.vue is rendered OUTSIDE NuxtLayout, so we apply data-theme ourselves
// based on the path the user was trying to reach.
const section = computed<Section>(() => {
  const path = route.path || ''
  if (path.startsWith('/trader')) return 'trader'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/bank')) return 'bank'
  return 'hub'
})

const themeAttr = computed(() => (section.value === 'hub' ? undefined : section.value))

const status = computed(() => Number(props.error?.statusCode ?? 404))
const isNotFound = computed(() => status.value === 404)

const headline = computed(() =>
  isNotFound.value ? t('errorPage.notFound.headline') : t('errorPage.generic.headline')
)
const subtitle = computed(() =>
  isNotFound.value ? t('errorPage.notFound.subtitle') : t('errorPage.generic.subtitle')
)
const description = computed(() =>
  isNotFound.value ? t('errorPage.notFound.title') : t('errorPage.generic.title')
)

const homePath = computed(() => {
  if (section.value === 'trader') return '/trader'
  if (section.value === 'admin') return '/admin'
  if (section.value === 'bank') return '/bank'
  return '/'
})

// Stable through rerenders so the displayed receipt does not flicker on locale switch.
const timestamp = useState('errorPageTimestamp', () => new Date().toISOString())
const refId = useState('errorPageRefId', () => {
  const seed = `${route.fullPath}|${Date.now()}|${Math.random()}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  return 'ERR-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0').slice(0, 8)
})

useHead(() => ({ title: `${status.value} · ${description.value}` }))

function handleHome() {
  clearError({ redirect: homePath.value })
}

function handleBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
  } else {
    clearError({ redirect: homePath.value })
  }
}

function handleJump(path: string) {
  clearError({ redirect: path })
}

interface Destination {
  id: 'trader' | 'admin' | 'bank'
  to: string
}
const destinations: Destination[] = [
  { id: 'trader', to: '/trader' },
  { id: 'admin', to: '/admin' },
  { id: 'bank', to: '/bank' }
]
const otherDestinations = computed(() =>
  destinations.filter(d => d.id !== section.value)
)
</script>

<template>
  <div :data-theme="themeAttr" class="error-shell min-h-dvh bg-bg text-text flex flex-col">
    <header class="flex items-center justify-between px-6 py-4 border-b border-border">
      <NuxtLink
        to="/"
        class="text-[11px] tracking-[0.3em] uppercase text-text-muted hover:text-text transition"
      >
        Bank × VASP Demo
      </NuxtLink>
      <BaseLangSwitch />
    </header>

    <main class="flex-1 grid place-items-center px-6 py-12">
      <div class="w-full max-w-3xl">
        <!-- Top status row -->
        <div class="mb-5 flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-text-muted">
          <span class="inline-block w-2 h-2 rounded-full bg-danger animate-pulse" aria-hidden="true" />
          <span class="font-mono">{{ subtitle }}</span>
          <span class="ml-auto font-mono text-text">{{ refId }}</span>
        </div>

        <!-- Receipt-style card -->
        <article class="relative bg-surface border border-border rounded-lg shadow-md overflow-hidden">
          <!-- Brand gradient bar -->
          <div class="h-1 bg-gradient-to-r from-primary-900 via-primary-500 to-gold-500" aria-hidden="true" />

          <div class="grid md:grid-cols-[auto_1fr] gap-8 md:gap-10 p-8 md:p-12">
            <!-- Status code block -->
            <div class="flex flex-col">
              <div
                class="font-mono font-bold leading-none tracking-tight text-primary-700 select-none"
                style="font-size: clamp(5rem, 14vw, 9rem);"
              >
                {{ status }}
              </div>
              <div class="mt-3 text-[11px] font-mono tracking-[0.2em] uppercase text-text-muted">
                STATUS · {{ status }}
              </div>
            </div>

            <!-- Detail block -->
            <div class="flex flex-col justify-center min-w-0">
              <h1 class="text-2xl md:text-3xl font-bold mb-3 text-text leading-snug">
                {{ headline }}
              </h1>
              <p class="text-sm leading-relaxed text-text-muted mb-6">
                {{ description }}
              </p>

              <!-- Receipt detail rows -->
              <dl class="text-sm border border-border rounded-md mb-6 overflow-hidden">
                <div class="flex items-start justify-between gap-4 px-4 py-2.5 bg-surface-alt">
                  <dt class="text-text-muted text-[11px] uppercase tracking-wider shrink-0">
                    {{ $t('errorPage.detail.section') }}
                  </dt>
                  <dd class="font-mono text-xs text-text text-right">
                    {{ $t(`errorPage.section.${section}`) }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4 px-4 py-2.5 border-t border-border">
                  <dt class="text-text-muted text-[11px] uppercase tracking-wider shrink-0">
                    {{ $t('errorPage.detail.path') }}
                  </dt>
                  <dd class="font-mono text-xs text-text break-all text-right min-w-0">
                    {{ route.fullPath }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4 px-4 py-2.5 border-t border-border">
                  <dt class="text-text-muted text-[11px] uppercase tracking-wider shrink-0">
                    {{ $t('errorPage.detail.timestamp') }}
                  </dt>
                  <dd class="font-mono text-xs text-text text-right">
                    {{ timestamp }}
                  </dd>
                </div>
                <div
                  v-if="error?.statusMessage"
                  class="flex items-start justify-between gap-4 px-4 py-2.5 border-t border-border"
                >
                  <dt class="text-text-muted text-[11px] uppercase tracking-wider shrink-0">
                    {{ $t('errorPage.detail.message') }}
                  </dt>
                  <dd class="text-xs text-text text-right break-words min-w-0">
                    {{ error.statusMessage }}
                  </dd>
                </div>
              </dl>

              <div class="flex flex-wrap gap-3">
                <BaseButton variant="primary" @click="handleHome">
                  {{ section === 'hub' ? $t('errorPage.action.homeHub') : $t('errorPage.action.home') }}
                </BaseButton>
                <BaseButton variant="secondary" @click="handleBack">
                  {{ $t('errorPage.action.back') }}
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Footer note -->
          <footer class="px-8 md:px-12 py-3 bg-surface-alt border-t border-border text-[11px] text-text-muted tracking-wider uppercase font-mono">
            {{ $t('errorPage.note') }}
          </footer>
        </article>

        <!-- Cross-section jump -->
        <section v-if="otherDestinations.length" class="mt-8">
          <div class="text-[11px] tracking-[0.2em] uppercase text-text-muted mb-3">
            {{ $t('errorPage.destinations.title') }}
          </div>
          <div class="grid sm:grid-cols-3 gap-3">
            <button
              v-for="d in otherDestinations"
              :key="d.id"
              type="button"
              class="group text-left bg-surface border border-border rounded-md px-4 py-3 hover:border-primary-500 hover:shadow-sm transition"
              @click="handleJump(d.to)"
            >
              <div class="text-[10px] tracking-[0.2em] uppercase text-text-muted mb-1">
                {{ $t(`errorPage.section.${d.id}`) }}
              </div>
              <div class="text-sm font-medium text-text group-hover:text-brand transition">
                {{ $t(`errorPage.destinations.${d.id}`) }} →
              </div>
            </button>
          </div>
        </section>

        <p class="mt-8 text-center text-[10px] text-text-muted tracking-[0.25em] uppercase">
          {{ $t('errorPage.demoNote') }}
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.error-shell {
  // Subtle ledger grid backdrop — anchors to surface tokens so all three themes inherit it.
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--color-border) 35%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--color-border) 35%, transparent) 1px, transparent 1px);
  background-size: 48px 48px;
  background-position: -1px -1px;
}
</style>
