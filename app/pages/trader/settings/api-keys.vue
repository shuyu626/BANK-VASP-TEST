<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import type { ApiKeyPermission } from '~~/shared/types'

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

    <section>
      <h2 class="text-lg font-semibold mb-3">{{ $t('trader.settings.apiKeys.title') }}</h2>
      <div class="trader-panel overflow-x-auto">
        <table class="w-full text-sm min-w-[640px]">
          <thead>
            <tr class="text-xs text-text-muted border-b border-border">
              <th class="text-left px-4 py-3 font-medium">{{ $t('trader.settings.apiKeys.thLabel') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('trader.settings.apiKeys.thKeyId') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('trader.settings.apiKeys.thPermissions') }}</th>
              <th class="text-left px-4 py-3 font-medium">{{ $t('trader.settings.apiKeys.thCreatedAt') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ $t('common.label.action') }}</th>
            </tr>
          </thead>
          <tbody class="num">
            <tr v-if="apiKeys.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-text-muted">{{ $t('trader.settings.apiKeys.noKeys') }}</td>
            </tr>
            <tr v-for="k in apiKeys" :key="k.id" class="border-b border-border last:border-0">
              <td class="px-4 py-3 font-medium">{{ k.label }}</td>
              <td class="px-4 py-3 font-mono text-xs">{{ k.id }}</td>
              <td class="px-4 py-3 text-xs">
                <span v-for="p in k.permissions" :key="p" class="inline-block bg-surface-alt text-text-muted px-2 py-0.5 rounded-sm mr-1">
                  {{ p }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-text-muted">{{ fmtDtLocal(k.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <BaseButton variant="secondary" size="sm" class="!text-danger" @click="onDelete(k.id)">
                  {{ $t('trader.settings.apiKeys.deleteCta') }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="justCreatedKey"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-30 px-4"
        @click.self="settings.dismissCreated()"
      >
        <div class="trader-panel p-6 max-w-md w-full">
          <h3 class="text-lg font-semibold mb-3">{{ $t('trader.settings.apiKeys.createSuccess') }}</h3>
          <p class="text-sm text-warning mb-4">
            <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('trader.settings.apiKeys.secretWarning') }}
          </p>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-xs text-text-muted mb-1">{{ $t('trader.settings.apiKeys.apiKeyLabel') }}</div>
              <div class="font-mono text-xs bg-surface-alt px-3 py-2 rounded">{{ justCreatedKey.id }}</div>
            </div>
            <div>
              <div class="text-xs text-text-muted mb-1">{{ $t('trader.settings.apiKeys.secretKeyLabel') }}</div>
              <div class="flex items-center gap-2">
                <div class="font-mono text-xs bg-surface-alt px-3 py-2 rounded flex-1 break-all">{{ justCreatedKey.secret }}</div>
                <BaseButton variant="secondary" size="sm" @click="copySecret">{{ $t('trader.settings.apiKeys.copyCta') }}</BaseButton>
              </div>
            </div>
          </div>
          <BaseButton variant="primary" block class="mt-6" @click="settings.dismissCreated()">
            {{ $t('common.action.confirm') }}
          </BaseButton>
        </div>
      </div>
    </Teleport>
  </div>
</template>
