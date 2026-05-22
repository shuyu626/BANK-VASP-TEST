<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import type { ApiKeyPermission } from '~~/shared/types'
import type { TableColumn } from '~/components/common/BaseTable.vue'

const { t } = useI18n()
useHead(() => ({ title: t('trader.settings.headTitle') }))

const settings = useSettingsStore()
const { apiKeys, justCreatedKey } = storeToRefs(settings)
const { confirm } = useConfirm()
await settings.loadApiKeys()

const label = ref('')
const permReadOnly = ref(true)
const permTrade = ref(false)
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

const permissions = computed(() => {
  const p: ApiKeyPermission[] = []
  if (permReadOnly.value) p.push('read')
  if (permTrade.value) p.push('trade')
  return p
})

const canCreate = computed(() => label.value.trim().length > 0 && permissions.value.length > 0 && !submitting.value)

async function onCreate() {
  if (!canCreate.value) return
  submitting.value = true
  errorMsg.value = null
  try {
    await settings.createApiKey({ label: label.value.trim(), permissions: permissions.value })
    label.value = ''
    permReadOnly.value = true
    permTrade.value = false
  } catch (err: unknown) {
    errorMsg.value = extract(err)
  } finally {
    submitting.value = false
  }
}

async function onDelete(id: string) {
  const ok = await confirm({
    message: t('trader.settings.apiKeys.deleteCta') + '?',
    variant: 'danger',
    confirmText: t('trader.settings.apiKeys.deleteCta')
  })
  if (!ok) return
  try {
    await settings.deleteApiKey(id)
  } catch (err: unknown) {
    errorMsg.value = extract(err)
  }
}

async function copySecret() {
  if (!justCreatedKey.value) return
  try {
    await navigator.clipboard.writeText(justCreatedKey.value.secret)
  } catch {}
}

function extract(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const x = e as { statusMessage?: string; message?: string }
    return x.statusMessage ?? x.message ?? t('trader.settings.apiKeys.errorDefault')
  }
  return t('trader.settings.apiKeys.errorDefault')
}
function fmtDtLocal(iso: string) { return iso.slice(0, 19).replace('T', ' ') }

function onModalToggle(open: boolean) {
  if (!open) settings.dismissCreated()
}

const apiColumns = computed<TableColumn[]>(() => [
  { key: 'label', label: t('trader.settings.apiKeys.thLabel') },
  { key: 'id', label: t('trader.settings.apiKeys.thKeyId') },
  { key: 'permissions', label: t('trader.settings.apiKeys.thPermissions') },
  { key: 'createdAt', label: t('trader.settings.apiKeys.thCreatedAt') },
  { key: 'actions', label: t('common.label.action'), align: 'right' }
])
</script>

<template>
  <div class="space-y-6">
    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.apiKeys.createCta') }}</h2>
      <p class="text-xs text-text-muted mb-4">
        {{ $t('trader.settings.apiKeys.subtitle') }}
      </p>
      <form class="space-y-3 max-w-md" @submit.prevent="onCreate">
        <BaseInput
          v-model="label"
          :maxlength="40"
          :label="$t('trader.settings.apiKeys.labelLabel')"
          :placeholder="$t('trader.settings.apiKeys.labelPlaceholder')"
        />
        <div class="space-y-2">
          <div class="text-xs text-text-muted">{{ $t('trader.settings.apiKeys.permissionsLabel') }}</div>
          <BaseCheckbox v-model="permReadOnly" :label="$t('trader.settings.apiKeys.permRead')" />
          <BaseCheckbox v-model="permTrade" :label="$t('trader.settings.apiKeys.permTrade')" />
        </div>
        <p v-if="errorMsg" class="text-sm text-danger">{{ errorMsg }}</p>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!canCreate"
          :loading="submitting"
        >
          {{ submitting ? $t('common.action.processing') : $t('trader.settings.apiKeys.submitCta') }}
        </BaseButton>
      </form>
    </section>
      <div class="trader-panel overflow-x-auto">
        <BaseTable
          :columns="apiColumns"
          :items="apiKeys"
          row-key="id"
          paginated
          :default-page-size="10"
          :empty-text="$t('trader.settings.apiKeys.noKeys')"
          panel-class=""
          min-height="140px"
          numeric
        >
          <template #cell-label="{ row }">
            <span class="font-medium">{{ row.label }}</span>
          </template>
          <template #cell-id="{ row }">
            <span class="font-mono text-xs text-text-muted">{{ row.id }}</span>
          </template>
          <template #cell-permissions="{ row }">
            <span
              v-for="p in row.permissions"
              :key="p"
              class="inline-block border border-border text-text-muted px-2 py-0.5 rounded-sm mr-1 font-mono text-[0.65rem] uppercase tracking-[0.12em]"
            >
              {{ p }}
            </span>
          </template>
          <template #cell-createdAt="{ row }">
            <span class="text-xs text-text-muted">{{ fmtDtLocal(row.createdAt) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <BaseButton variant="secondary" size="sm" tone="danger" @click="onDelete(row.id)">
              {{ $t('trader.settings.apiKeys.deleteCta') }}
            </BaseButton>
          </template>
        </BaseTable>
      </div>
    <BaseModal
      :model-value="!!justCreatedKey"
      :title="$t('trader.settings.apiKeys.createSuccess')"
      width="md"
      @update:model-value="onModalToggle"
    >
      <div v-if="justCreatedKey" class="space-y-4">
        <p class="text-sm text-warning flex items-start gap-2">
          <Icon name="lucide:triangle-alert" class="shrink-0 mt-0.5" size="15" aria-hidden="true" />
          <span>{{ $t('trader.settings.apiKeys.secretWarning') }}</span>
        </p>
        <div>
          <div class="text-xs text-text-muted mb-1">{{ $t('trader.settings.apiKeys.apiKeyLabel') }}</div>
          <div class="font-mono text-xs bg-surface-alt px-3 py-2 rounded break-all">{{ justCreatedKey.id }}</div>
        </div>
        <div>
          <div class="text-xs text-text-muted mb-1">{{ $t('trader.settings.apiKeys.secretKeyLabel') }}</div>
          <div class="flex items-center gap-2">
            <div class="font-mono text-xs bg-surface-alt px-3 py-2 rounded flex-1 break-all">{{ justCreatedKey.secret }}</div>
            <BaseButton variant="secondary" size="sm" @click="copySecret">
              {{ $t('trader.settings.apiKeys.copyCta') }}
            </BaseButton>
          </div>
        </div>
      </div>
      <template #footer="{ close }">
        <BaseButton variant="primary" block @click="close">
          {{ $t('common.action.confirm') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
