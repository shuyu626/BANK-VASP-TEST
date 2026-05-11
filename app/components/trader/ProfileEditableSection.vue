<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from '~/stores/session'
import { UpdateProfileInputSchema, type AuthSession } from '~~/shared/types'

// 個資編輯區塊（dossier 03）。內含 displayName 表單 + 提交。
// 因為 dirty state 會被父頁面用於 useUnsavedChanges，透過 expose 對外提供。

const { t } = useI18n()
const toast = useToast()
const session = useSessionStore()
const { user } = storeToRefs(session)

const draftDisplayName = ref(user.value?.displayName ?? '')
const submitting = ref(false)
const formError = ref<string | null>(null)

watch(user, (u) => {
  if (u && !submitting.value) draftDisplayName.value = u.displayName
})

const parsed = computed(() =>
  UpdateProfileInputSchema.safeParse({ displayName: draftDisplayName.value })
)
const issue = computed(() =>
  parsed.value.success ? null : parsed.value.error.issues[0]?.message ?? null
)
const dirty = computed(
  () => user.value !== null && draftDisplayName.value !== user.value.displayName
)
const canSave = computed(() => dirty.value && parsed.value.success && !submitting.value)

defineExpose({
  isDirty: () => dirty.value && !submitting.value
})

async function onSave() {
  if (!parsed.value.success) return
  submitting.value = true
  formError.value = null
  try {
    const res = await $fetch<{ user: AuthSession['user'] }>('/api/trader/profile', {
      method: 'PATCH',
      body: parsed.value.data
    })
    session.patchUser(res.user)
    toast.success(t('trader.settings.profile.savedToast'))
  } catch (err: unknown) {
    formError.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="dossier__panel">
    <div class="dossier__sectionHead">
      <span class="dossier__sectionNum">{{ t('trader.settings.profile.section03') }}</span>
    </div>

    <form class="space-y-4" @submit.prevent="onSave">
      <BaseInput
        id="displayName"
        v-model="draftDisplayName"
        :label="t('trader.settings.profile.displayNameLabel')"
        :hint="t('trader.settings.profile.displayNameHint')"
        :error="draftDisplayName && issue ? issue : undefined"
        :maxlength="40"
      />

      <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

      <div class="flex items-center gap-3">
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!canSave"
          :loading="submitting"
        >
          {{ submitting ? t('trader.settings.profile.saving') : t('trader.settings.profile.saveBtn') }}
        </BaseButton>
        <span v-if="!dirty" class="text-xs text-text-muted">
          {{ t('trader.settings.profile.noChange') }}
        </span>
      </div>
    </form>
  </section>
</template>
