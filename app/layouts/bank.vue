<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const mobileNavOpen = ref(false)

const breadcrumb = useRouteBreadcrumb()

const nav = computed(() => [
  { label: t('bank.nav.dashboard'), to: '/bank' },
  { label: t('bank.nav.trustAccounts'), to: '/bank/trust-accounts' },
  { label: t('bank.nav.kycMatch'), to: '/bank/kyc-match' },
  { label: t('bank.nav.reconciliation'), to: '/bank/reconciliation' },
  { label: t('bank.nav.aml'), to: '/bank/aml' },
  { label: t('bank.nav.ctr'), to: '/bank/ctr' },
  { label: t('bank.nav.sar'), to: '/bank/sar' },
  { label: t('bank.nav.regulatorReports'), to: '/bank/regulator-reports' },
  { label: t('bank.nav.blacklist'), to: '/bank/blacklist' }
])

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})

watch(mobileNavOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div data-theme="bank" class="min-h-dvh bg-bg text-text">
    <BaseDemoBanner />
    <header class="bank-banner sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-sm border border-white/30 text-white hover:bg-white/10 transition shrink-0"
            :aria-label="$t('common.action.openMenu')"
            :aria-expanded="mobileNavOpen"
            @click="mobileNavOpen = true"
          >
            <Icon name="lucide:menu" size="18" aria-hidden="true" />
          </button>
          <div class="w-9 h-9 bg-gold-500 text-primary-950 flex items-center justify-center rounded-sm font-bold shrink-0">{{ $t('components.bankLogo') }}</div>
          <div class="min-w-0">
            <div class="font-semibold text-base sm:text-lg leading-tight truncate">{{ $t('bank.brand') }}</div>
            <div class="text-xs text-neutral-300 font-light tracking-wider truncate">{{ $t('bank.subtitle') }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
          <span class="hidden sm:inline bank-stamp bank-stamp--light">{{ $t('bank.demoStamp') }}</span>
          <BaseLangSwitch />
          <NuxtLink to="/" class="hidden sm:inline text-neutral-300 hover:text-white whitespace-nowrap">{{ $t('nav.backToHub') }}</NuxtLink>
        </div>
      </div>
      <nav class="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul class="flex flex-wrap gap-x-1 text-sm">
          <li v-for="item in nav" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="inline-block px-3 lg:px-4 py-2.5 text-neutral-200 hover:bg-white/5 hover:text-white transition border-b-2 border-transparent whitespace-nowrap"
              active-class="text-white border-gold-500"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileNavOpen" class="md:hidden fixed inset-0 z-40" data-theme="bank">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="mobileNavOpen = false" />
          <aside class="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-primary-900 text-white shadow-xl flex flex-col border-r-2 border-gold-500">
            <div class="flex items-center justify-between px-4 py-4 border-b border-white/15">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 bg-gold-500 text-primary-950 flex items-center justify-center rounded-sm font-bold shrink-0">{{ $t('components.bankLogo') }}</div>
                <span class="font-semibold text-base truncate">{{ $t('bank.brand') }}</span>
              </div>
              <button
                type="button"
                class="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-white/30 text-white hover:bg-white/10 transition"
                :aria-label="$t('common.action.closeMenu')"
                @click="mobileNavOpen = false"
              >
                <Icon name="lucide:x" size="18" aria-hidden="true" />
              </button>
            </div>
            <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
              <NuxtLink
                v-for="item in nav"
                :key="item.to"
                :to="item.to"
                class="block px-3 py-2.5 rounded-sm text-neutral-200 hover:bg-white/10 hover:text-white transition border-l-2 border-transparent"
                active-class="text-white !border-gold-500 bg-white/5"
              >
                {{ item.label }}
              </NuxtLink>
            </nav>
            <div class="px-4 py-3 border-t border-white/15 flex items-center justify-between gap-2">
              <span class="bank-stamp bank-stamp--light">{{ $t('bank.demoStamp') }}</span>
              <NuxtLink to="/" class="text-xs text-neutral-300 hover:text-white">{{ $t('nav.backToHub') }}</NuxtLink>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <BaseBreadcrumb v-if="breadcrumb.length" :items="breadcrumb" class="mb-6" />
      <slot />
    </main>
    <BaseToastHost />
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(-100%);
}
</style>
