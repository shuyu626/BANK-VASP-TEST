<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'

const session = useSessionStore()
const { user, isAuthenticated, kycStatus } = storeToRefs(session)
const router = useRouter()
const route = useRoute()
const toast = useToast()
const menuOpen = ref(false)
const mobileNavOpen = ref(false)
const { t } = useI18n()

const { prefs } = useTraderPrefs()

const TRADER_IDLE_MS = 30 * 60 * 1000
useIdleLogout({
  timeoutMs: TRADER_IDLE_MS,
  enabled: () => isAuthenticated.value,
  onLogout: async () => {
    await session.logout()
    toast.warning(t('common.idle.loggedOut', { minutes: TRADER_IDLE_MS / 60_000 }), 6000)
    router.push('/trader/login')
  }
})

const nav = computed(() => [
  { label: t('trader.nav.markets'), to: '/trader/markets' },
  { label: t('trader.nav.trade'), to: `/trader/trade/${prefs.value.defaultPair}` },
  { label: t('trader.nav.wallet'), to: '/trader/wallet' },
  { label: t('trader.nav.orders'), to: '/trader/orders' }
])

async function onLogout() {
  menuOpen.value = false
  mobileNavOpen.value = false
  await session.logout()
  toast.success(t('common.toast.logoutSuccess'))
  router.push('/trader/login')
}

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
  menuOpen.value = false
})

// ─── Mobile drawer & user menu a11y ────────────────────────────
const mobileNavTriggerRef = ref<HTMLButtonElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)
const menuTriggerRef = ref<HTMLButtonElement | null>(null)
const menuPanelRef = ref<HTMLElement | null>(null)
let mobilePreviouslyFocused: HTMLElement | null = null

const FOCUSABLE_SELECTOR = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'

function focusablesIn(el: HTMLElement | null): HTMLElement[] {
  if (!el) return []
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(node => node.offsetParent !== null)
}

watch(mobileNavOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    mobilePreviouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nextTick(() => {
      const first = focusablesIn(drawerRef.value)[0]
      first?.focus({ preventScroll: true })
    })
  } else {
    mobilePreviouslyFocused?.focus({ preventScroll: true })
    mobilePreviouslyFocused = null
  }
})

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (mobileNavOpen.value) { mobileNavOpen.value = false; return }
    if (menuOpen.value) { menuOpen.value = false; menuTriggerRef.value?.focus({ preventScroll: true }); return }
  }
  if (e.key !== 'Tab') return
  if (mobileNavOpen.value && drawerRef.value?.contains(document.activeElement)) {
    const list = focusablesIn(drawerRef.value)
    if (list.length === 0) return
    const first = list[0]!
    const last = list[list.length - 1]!
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus({ preventScroll: true }) }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus({ preventScroll: true }) }
  }
}

function onGlobalMousedown(e: MouseEvent) {
  if (!menuOpen.value) return
  const target = e.target as Node
  if (menuPanelRef.value?.contains(target)) return
  if (menuTriggerRef.value?.contains(target)) return
  menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('mousedown', onGlobalMousedown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('mousedown', onGlobalMousedown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div data-theme="trader" class="min-h-dvh bg-bg text-text">
    <BaseDemoBanner />
    <header class="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 lg:gap-8">
        <button
          ref="mobileNavTriggerRef"
          type="button"
          class="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-alt transition"
          :aria-label="$t('common.action.openMenu')"
          :aria-expanded="mobileNavOpen"
          aria-haspopup="dialog"
          @click="mobileNavOpen = true"
        >
          <Icon name="lucide:menu" size="18" aria-hidden="true" />
        </button>

        <NuxtLink to="/trader" class="flex items-center gap-2 font-bold text-base sm:text-lg min-w-0">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
          <span class="truncate">{{ $t('trader.brand') }}</span>
          <span class="hidden md:inline text-text-muted font-normal text-xs truncate">{{ $t('trader.subtitle') }}</span>
        </NuxtLink>
        <nav class="hidden lg:flex items-center gap-6 text-sm">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="text-text-muted hover:text-text transition"
            active-class="text-primary-500"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div class="ml-auto flex items-center gap-2 sm:gap-3 text-sm">
          <BaseLangSwitch />
          <NuxtLink to="/" class="hidden sm:inline text-text-muted hover:text-text">{{ $t('nav.backToHub') }}</NuxtLink>

          <TraderNotificationBell v-if="isAuthenticated && user" />

          <template v-if="isAuthenticated && user">
            <div class="relative">
              <button
                ref="menuTriggerRef"
                type="button"
                class="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md border border-border hover:bg-surface-alt transition max-w-[180px]"
                :aria-expanded="menuOpen"
                aria-haspopup="menu"
                @click="menuOpen = !menuOpen"
              >
                <span class="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center font-semibold shrink-0">
                  {{ user.displayName.charAt(0) }}
                </span>
                <span class="hidden sm:inline truncate">{{ user.displayName }}</span>
                <span
                  v-if="kycStatus !== 'approved'"
                  class="hidden sm:inline text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-warning/20 text-warning shrink-0"
                >{{ $t('trader.menu.kycPending', { status: kycStatus }) }}</span>
              </button>
              <div
                v-if="menuOpen"
                ref="menuPanelRef"
                class="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-md shadow-lg py-1 z-20"
                role="menu"
              >
                <NuxtLink to="/trader/wallet" role="menuitem" class="block px-3 py-2 text-sm hover:bg-surface-alt" @click="menuOpen = false">
                  {{ $t('trader.menu.wallet') }}
                </NuxtLink>
                <NuxtLink to="/trader/orders" role="menuitem" class="block px-3 py-2 text-sm hover:bg-surface-alt" @click="menuOpen = false">
                  {{ $t('trader.menu.orders') }}
                </NuxtLink>
                <NuxtLink to="/trader/kyc" role="menuitem" class="block px-3 py-2 text-sm hover:bg-surface-alt" @click="menuOpen = false">
                  {{ $t('trader.menu.kyc') }}
                </NuxtLink>
                <NuxtLink to="/trader/settings" role="menuitem" class="block px-3 py-2 text-sm hover:bg-surface-alt" @click="menuOpen = false">
                  {{ $t('trader.menu.settings') }}
                </NuxtLink>
                <div class="border-t border-border my-1" />
                <button
                  type="button"
                  role="menuitem"
                  class="block w-full text-left px-3 py-2 text-sm hover:bg-surface-alt text-danger"
                  @click="onLogout"
                >
                  {{ $t('common.action.logout') }}
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <NuxtLink to="/trader/register" class="hidden sm:inline text-text-muted hover:text-text">{{ $t('common.action.register') }}</NuxtLink>
            <NuxtLink to="/trader/login" class="trader-cta !py-2 !px-3 sm:!py-2.5 sm:!px-5 text-sm">{{ $t('common.action.login') }}</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileNavOpen" class="lg:hidden fixed inset-0 z-40" data-theme="trader">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="mobileNavOpen = false"
          />
          <aside
            ref="drawerRef"
            role="dialog"
            aria-modal="true"
            :aria-label="$t('common.action.openMenu')"
            tabindex="-1"
            class="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-surface border-r border-border shadow-xl flex flex-col outline-none"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-border">
              <span class="font-bold flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary-500" />
                {{ $t('trader.brand') }}
              </span>
              <button
                type="button"
                class="w-9 h-9 rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-alt transition inline-flex items-center justify-center"
                :aria-label="$t('common.action.closeMenu')"
                @click="mobileNavOpen = false"
              >
                <Icon name="lucide:x" size="18" aria-hidden="true" />
              </button>
            </div>
            <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-sm">
              <NuxtLink
                v-for="item in nav"
                :key="item.to"
                :to="item.to"
                class="block px-3 py-2.5 rounded-md text-text-muted hover:text-text hover:bg-surface-alt transition"
                active-class="!text-primary-500 bg-surface-alt"
              >
                {{ item.label }}
              </NuxtLink>
              <div class="border-t border-border my-2" />
              <NuxtLink to="/" class="block px-3 py-2.5 rounded-md text-text-muted hover:text-text hover:bg-surface-alt">
                {{ $t('nav.backToHub') }}
              </NuxtLink>
              <template v-if="!isAuthenticated">
                <NuxtLink to="/trader/login" class="block px-3 py-2.5 rounded-md text-text-muted hover:text-text hover:bg-surface-alt">
                  {{ $t('common.action.login') }}
                </NuxtLink>
                <NuxtLink to="/trader/register" class="block px-3 py-2.5 rounded-md text-text-muted hover:text-text hover:bg-surface-alt">
                  {{ $t('common.action.register') }}
                </NuxtLink>
              </template>
            </nav>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
