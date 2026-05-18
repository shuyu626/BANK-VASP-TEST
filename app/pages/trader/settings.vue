<script setup lang="ts">
definePageMeta({ layout: 'trader' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

onMounted(() => {
  if (route.path === '/trader/settings' || route.path === '/trader/settings/') {
    router.replace('/trader/settings/profile')
  }
})

const nav = computed(() => [
  { to: '/trader/settings/profile', label: t('trader.settings.tab.profile'), icon: 'lucide:user-round' },
  { to: '/trader/settings/security', label: t('trader.settings.tab.security'), icon: 'lucide:shield-check' },
  { to: '/trader/settings/api-keys', label: t('trader.settings.tab.apiKeys'), icon: 'lucide:key-round' },
  { to: '/trader/settings/preferences', label: t('trader.settings.tab.preferences'), icon: 'lucide:sliders-horizontal' }
])
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <header class="mb-6 sm:mb-8">
      <h1 class="text-2xl font-bold tracking-tight">{{ $t('trader.settings.title') }}</h1>
      <p class="text-sm text-text-muted mt-1">{{ $t('trader.settings.subtitle') }}</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10">
      <aside>
        <nav
          class="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-24
              -mx-1 px-1 md:mx-0 md:px-0 pb-1 md:pb-0"
        >
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="group relative shrink-0 md:shrink inline-flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-sm text-text-muted transition-colors duration-150
            hover:text-text hover:bg-surface-alt
            before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
            before:h-0 before:w-[3px] before:rounded-full before:bg-primary-500
            before:transition-all before:duration-200"
            active-class="!text-primary-400 bg-primary-500/10 font-medium before:h-6"
          >
            <Icon
              :name="item.icon"
              size="18"
              class="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
      <section class="min-w-0">
        <NuxtPage />
      </section>
    </div>
  </div>
</template>
