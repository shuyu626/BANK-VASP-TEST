<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminSessionStore } from '~/stores/admin-session'

const session = useAdminSessionStore()
const { admin, isAuthenticated } = storeToRefs(session)
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { t } = useI18n()

// Idle 自動登出（admin 5 分鐘 — 金融後台敏感操作多，採嚴格時限）
const ADMIN_IDLE_MS = 5 * 60 * 1000
useIdleLogout({
  timeoutMs: ADMIN_IDLE_MS,
  enabled: () => isAuthenticated.value,
  onLogout: async () => {
    await session.logout()
    toast.warning(t('common.idle.loggedOut', { minutes: ADMIN_IDLE_MS / 60_000 }), 6000)
    router.push('/admin/login')
  }
})

const sections = computed(() => [
  { group: t('admin.section.overview'),
    items: [{ label: t('admin.nav.dashboard'), to: '/admin' }] },
  { group: t('admin.section.compliance'),
    items: [
      { label: t('admin.nav.kyc'), to: '/admin/kyc' },
      { label: t('admin.nav.users'), to: '/admin/users' },
      { label: t('admin.nav.risk'), to: '/admin/risk' },
      { label: t('admin.nav.blacklist'), to: '/admin/blacklist' }
    ] },
  { group: t('admin.section.trading'),
    items: [
      { label: t('admin.nav.orderbook'), to: '/admin/orderbook' },
      { label: t('admin.nav.fiat'), to: '/admin/fiat' }
    ] },
  { group: t('admin.section.audit'),
    items: [
      { label: t('admin.nav.audit'), to: '/admin/audit' },
      { label: t('admin.nav.reports'), to: '/admin/reports' }
    ] }
])

const roleLabel = computed<Record<string, string>>(() => ({
  ops: t('admin.role.ops'),
  compliance: t('admin.role.compliance'),
  risk: t('admin.role.risk')
}))

async function onLogout() {
  await session.logout()
  toast.success(t('common.toast.logoutSuccess'))
  router.push('/admin/login')
}

// Sidebar 收合：mobile 為抽屜（off-canvas），desktop 可改為窄版（icon-only）
const mobileSidebarOpen = ref(false)
const desktopCollapsed = ref(false)

watch(() => route.fullPath, () => {
  mobileSidebarOpen.value = false
})

watch(mobileSidebarOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div data-theme="admin" class="min-h-dvh bg-bg text-text flex flex-col">
    <BaseDemoBanner />
    <div class="flex-1 min-h-0 lg:flex">
    <!-- Mobile top bar (lg 以下顯示) -->
    <header class="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-neutral-800 text-white border-b border-neutral-700">
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-neutral-600 hover:bg-neutral-700 transition"
        :aria-label="$t('common.action.openMenu')"
        :aria-expanded="mobileSidebarOpen"
        @click="mobileSidebarOpen = true"
      >
        <Icon name="lucide:menu" size="18" aria-hidden="true" />
      </button>
      <NuxtLink to="/admin" class="flex items-center gap-2 font-semibold min-w-0">
        <span class="w-2 h-2 bg-primary-400 rounded-full shrink-0" />
        <span class="truncate">{{ $t('admin.brand') }}</span>
      </NuxtLink>
      <div class="ml-auto">
        <BaseLangSwitch />
      </div>
    </header>

    <!-- Desktop sidebar -->
    <aside
      class="admin-sidebar hidden lg:flex flex-shrink-0 px-4 py-6 flex-col transition-[width] duration-200"
      :class="desktopCollapsed ? 'w-16' : 'w-60'"
    >
      <div class="flex items-center justify-between gap-2 mb-8" :class="desktopCollapsed ? 'flex-col' : ''">
        <NuxtLink to="/admin" class="text-white font-semibold text-lg flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 bg-primary-400 rounded-full shrink-0" />
          <span v-if="!desktopCollapsed" class="truncate">{{ $t('admin.brand') }}</span>
        </NuxtLink>
        <button
          type="button"
          class="w-8 h-8 inline-flex items-center justify-center rounded text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
          :title="$t('common.action.toggleSidebar')"
          :aria-label="$t('common.action.toggleSidebar')"
          @click="desktopCollapsed = !desktopCollapsed"
        >
        </button>
      </div>
      <nav class="space-y-6 flex-1 overflow-y-auto" :class="desktopCollapsed ? 'space-y-2' : ''">
        <div v-for="s in sections" :key="s.group">
          <div v-if="!desktopCollapsed" class="text-[11px] uppercase tracking-wider text-neutral-400 mb-2">{{ s.group }}</div>
          <ul class="space-y-1">
            <li v-for="item in s.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="block rounded text-sm text-neutral-200 hover:bg-neutral-700 transition"
                :class="desktopCollapsed ? 'px-2 py-2 text-center text-xs' : 'px-3 py-1.5'"
                :title="desktopCollapsed ? item.label : undefined"
                active-class="bg-primary-700 text-white"
              >
                {{ desktopCollapsed ? item.label.charAt(0) : item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <div v-if="isAuthenticated && admin && !desktopCollapsed" class="mt-4 pt-4 border-t border-neutral-700">
        <div class="text-xs text-neutral-300">
          <div class="font-semibold truncate">{{ admin.displayName }}</div>
          <div class="text-neutral-400 mt-0.5">
            <span class="inline-block bg-primary-700 text-white px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider">
              {{ roleLabel[admin.role] ?? admin.role }}
            </span>
          </div>
        </div>
        <button class="text-xs text-neutral-400 hover:text-danger mt-3" @click="onLogout">{{ $t('common.action.logout') }}</button>
      </div>
      <div v-if="!desktopCollapsed" class="mt-4 pt-4 border-t border-neutral-700 flex items-center justify-between gap-2">
        <NuxtLink to="/" class="text-xs text-neutral-400 hover:text-white truncate">{{ $t('nav.backToHub') }}</NuxtLink>
        <BaseLangSwitch />
      </div>
    </aside>

    <!-- Mobile drawer sidebar -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="mobileSidebarOpen" class="lg:hidden fixed inset-0 z-40" data-theme="admin">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="mobileSidebarOpen = false" />
          <aside class="admin-sidebar absolute top-0 left-0 h-full w-72 max-w-[85vw] px-4 py-4 flex flex-col shadow-xl">
            <div class="flex items-center justify-between mb-6">
              <NuxtLink to="/admin" class="text-white font-semibold text-lg flex items-center gap-2 min-w-0">
                <span class="w-2 h-2 bg-primary-400 rounded-full shrink-0" />
                <span class="truncate">{{ $t('admin.brand') }}</span>
              </NuxtLink>
              <button
                type="button"
                class="w-9 h-9 inline-flex items-center justify-center rounded-md border border-neutral-600 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
                :aria-label="$t('common.action.closeMenu')"
                @click="mobileSidebarOpen = false"
              >
                <Icon name="lucide:x" size="18" aria-hidden="true" />
              </button>
            </div>
            <nav class="space-y-5 flex-1 overflow-y-auto">
              <div v-for="s in sections" :key="s.group">
                <div class="text-[11px] uppercase tracking-wider text-neutral-400 mb-2">{{ s.group }}</div>
                <ul class="space-y-1">
                  <li v-for="item in s.items" :key="item.to">
                    <NuxtLink
                      :to="item.to"
                      class="block px-3 py-2 rounded text-sm text-neutral-200 hover:bg-neutral-700 transition"
                      active-class="bg-primary-700 text-white"
                    >
                      {{ item.label }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </nav>
            <div v-if="isAuthenticated && admin" class="mt-4 pt-4 border-t border-neutral-700">
              <div class="text-xs text-neutral-300">
                <div class="font-semibold truncate">{{ admin.displayName }}</div>
                <div class="text-neutral-400 mt-0.5">
                  <span class="inline-block bg-primary-700 text-white px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider">
                    {{ roleLabel[admin.role] ?? admin.role }}
                  </span>
                </div>
              </div>
              <button class="text-xs text-neutral-400 hover:text-danger mt-3" @click="onLogout">{{ $t('common.action.logout') }}</button>
            </div>
            <div class="mt-4 pt-4 border-t border-neutral-700 flex items-center justify-between gap-2">
              <NuxtLink to="/" class="text-xs text-neutral-400 hover:text-white truncate">{{ $t('nav.backToHub') }}</NuxtLink>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <main class="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-auto">
      <slot />
    </main>
    </div>
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
