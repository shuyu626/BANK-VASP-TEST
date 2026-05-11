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
  { to: '/trader/settings/profile', label: t('trader.settings.tab.profile') },
  { to: '/trader/settings/security', label: t('trader.settings.tab.security') },
  { to: '/trader/settings/api-keys', label: t('trader.settings.tab.apiKeys') },
  { to: '/trader/settings/preferences', label: t('trader.settings.tab.preferences') }
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-8 max-w-5xl mx-auto">
    <aside>
      <h1 class="text-lg font-semibold mb-4">{{ $t('trader.settings.title') }}</h1>
      <nav class="flex md:block flex-wrap gap-1 md:space-y-1 text-sm">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="block px-3 py-2 rounded hover:bg-surface-alt transition"
          active-class="bg-primary-500/10 text-primary-500"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>
    <section class="min-w-0">
      <NuxtPage />
    </section>
  </div>
</template>
