<script setup lang="ts">
// 元件位於 app.vue 層、在 NuxtLayout 之外，i18n plugin 找不到父 scope，明示 global 才不會噴
// [intlify] Not found parent scope.
const { t } = useI18n({ useScope: 'global' })
const { pending, settle } = useConfirm()

const open = computed({
  get: () => pending.value !== null,
  set: (v) => { if (!v) settle(false) }
})

const confirmLabel = computed(
  () => pending.value?.confirmText ?? t('common.action.confirm')
)
const cancelLabel = computed(
  () => pending.value?.cancelText ?? t('common.action.cancel')
)
const variant = computed(() => pending.value?.variant ?? 'primary')
</script>

<template>
  <BaseModal v-model="open" :title="pending?.title" width="sm">
    <p
      v-if="pending"
      class="text-sm text-text leading-relaxed whitespace-pre-line"
    >
      {{ pending.message }}
    </p>
    <template #footer>
      <BaseButton
        :variant="variant"
        @click="settle(true)"
      >
        {{ confirmLabel }}
      </BaseButton>
      <BaseButton variant="secondary" @click="settle(false)">
        {{ cancelLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
