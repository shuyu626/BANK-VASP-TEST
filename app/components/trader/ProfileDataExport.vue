<script setup lang="ts">
import type { User } from '~~/shared/types'

const props = defineProps<{
  user: User
}>()

const { t } = useI18n()

// 個資法 §11 — 資料可攜性 demo：把目前 user 已知欄位匯出為 JSON。
function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    notice: t('trader.settings.profile.exportHint'),
    user: props.user
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `taiex-profile-${props.user.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="dossier__panel">
    <div class="dossier__sectionHead">
      <span class="dossier__sectionNum">{{ t('trader.settings.profile.section05') }}</span>
    </div>

    <h3 class="dossier__exportTitle">{{ t('trader.settings.profile.exportTitle') }}</h3>
    <p class="dossier__exportHint">{{ t('trader.settings.profile.exportHint') }}</p>
    <BaseButton variant="secondary" size="sm" @click="exportData">
      <template #prefix>
        <Icon name="lucide:download" size="14" aria-hidden="true" />
      </template>
      {{ t('trader.settings.profile.exportBtn') }}
    </BaseButton>
  </section>
</template>
