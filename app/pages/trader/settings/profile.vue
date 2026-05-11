<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'

const { t } = useI18n()
const session = useSessionStore()
const { user } = storeToRefs(session)

useHead(() => ({ title: t('trader.settings.profile.headTitle') }))

const isVerified = computed(() => user.value?.kycStatus === 'approved')

function todayMeta() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const dossierMeta = computed(() =>
  t('trader.settings.profile.dossierMeta', {
    date: todayMeta(),
    id: (user.value?.id ?? '—').toUpperCase()
  })
)

// 子元件 expose 的 dirty 函式給 useUnsavedChanges 用
const editableRef = ref<{ isDirty: () => boolean } | null>(null)
useUnsavedChanges({ isDirty: () => editableRef.value?.isDirty() ?? false })
</script>

<template>
  <div v-if="user" class="dossier">
    <header class="dossier__header">
      <div class="dossier__brand">
        <span class="dossier__rule" aria-hidden="true" />
        <span class="dossier__label">{{ $t('trader.settings.profile.dossierLabel') }}</span>
        <span class="dossier__rule dossier__rule--grow" aria-hidden="true" />
      </div>
      <div class="dossier__meta">
        <span class="font-mono">{{ dossierMeta }}</span>
        <span
          v-if="isVerified"
          class="dossier__stamp"
          :title="$t('trader.settings.profile.stamp')"
        >
          {{ $t('trader.settings.profile.stamp') }}
        </span>
      </div>
    </header>

    <div class="dossier__grid">
      <TraderProfileIdentityCard :user="user" />

      <div class="dossier__main">
        <TraderProfileVerificationGrid :user="user" />
        <TraderProfileEditableSection ref="editableRef" />
        <TraderProfileQuickLinks />
        <TraderProfileDataExport :user="user" />

        <p class="dossier__footer">{{ $t('trader.settings.profile.footer') }}</p>
      </div>
    </div>
  </div>
</template>
