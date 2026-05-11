<script setup lang="ts">
const { t } = useI18n()

const quickLinks = computed(() => [
  { icon: 'lucide:key-round', label: t('trader.settings.profile.links.changePassword'), to: '/trader/settings/security' },
  { icon: 'lucide:shield-check', label: t('trader.settings.profile.links.totp'), to: '/trader/settings/security#totp' },
  { icon: 'lucide:terminal', label: t('trader.settings.profile.links.apiKeys'), to: '/trader/settings/api-keys' },
  { icon: 'lucide:badge-check', label: t('trader.settings.profile.links.kycUpgrade'), to: '/trader/kyc' },
  { icon: 'lucide:sliders-horizontal', label: t('trader.settings.profile.links.preferences'), to: '/trader/settings/preferences' }
])
</script>

<template>
  <section class="dossier__panel">
    <div class="dossier__sectionHead">
      <span class="dossier__sectionNum">{{ t('trader.settings.profile.section04') }}</span>
    </div>

    <ul class="dossier__links">
      <li v-for="(link, i) in quickLinks" :key="link.to">
        <NuxtLink :to="link.to" class="dossier__link">
          <span class="dossier__linkIndex">{{ String(i + 1).padStart(2, '0') }}</span>
          <Icon :name="link.icon" size="16" class="dossier__linkIcon" aria-hidden="true" />
          <span class="dossier__linkLabel">{{ link.label }}</span>
          <Icon name="lucide:arrow-up-right" size="14" class="dossier__linkArrow" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
