<script setup lang="ts">
import type { User } from '~~/shared/types'

const props = defineProps<{
  user: User
}>()

const { t } = useI18n()

const initials = computed(() => {
  const name = props.user.displayName
  if (!name) return '—'
  return Array.from(name)[0]?.toUpperCase() ?? '—'
})

const accountAgeDays = computed(() => {
  if (!props.user.createdAt) return 0
  const ms = Date.now() - new Date(props.user.createdAt).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
})

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
</script>

<template>
  <aside class="dossier__id">
    <div class="dossier__sectionHead">
      <span class="dossier__sectionNum">{{ t('trader.settings.profile.section01') }}</span>
    </div>

    <div class="dossier__avatar" aria-hidden="true">
      <span class="dossier__avatarChar">{{ initials }}</span>
      <span class="dossier__avatarRing" />
    </div>

    <div class="dossier__name">{{ user.displayName }}</div>
    <div class="dossier__sub">{{ user.email }}</div>

    <dl class="dossier__meta-list">
      <div>
        <dt>{{ t('trader.settings.profile.field.userId') }}</dt>
        <dd class="font-mono">{{ user.id }}</dd>
      </div>
      <div>
        <dt>{{ t('trader.settings.profile.field.memberSince') }}</dt>
        <dd class="font-mono">{{ formatDate(user.createdAt) }}</dd>
      </div>
    </dl>

    <div class="dossier__age">
      <div class="dossier__ageNum">{{ accountAgeDays }}</div>
      <div class="dossier__ageUnit">
        {{ t('trader.settings.profile.field.memberAge', { days: '' }).trim() }}
      </div>
    </div>
  </aside>
</template>
