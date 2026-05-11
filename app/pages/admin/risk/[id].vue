<script setup lang="ts">
import type { AmlAlert, User } from '~~/shared/types'
import type { AlertResolution } from '~~/shared/types/admin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const { t } = useI18n()

const { data, refresh } = await useFetch<{ alert: AmlAlert; user: User | null }>(
  () => `/api/admin/risk/alerts/${id.value}`,
  { headers: ssrCookieHeaders() }
)

useHead(() => ({ title: t('admin.risk.detail.title', { id: id.value }) + ' — Admin' }))

const resolution = ref<AlertResolution>('false_positive')
const note = ref('')
const narrative = ref('')
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

async function onResolve() {
  if (!data.value) return
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch(`/api/admin/risk/alerts/${id.value}/resolve`, {
      method: 'POST',
      body: {
        resolution: resolution.value,
        note: note.value || null,
        narrative: resolution.value === 'escalated_to_sar' ? narrative.value : null
      }
    })
    await refresh()
    router.push('/admin/risk')
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    errorMsg.value = e.statusMessage ?? t('admin.risk.detail.errorDefault')
  } finally {
    submitting.value = false
  }
}

const needsNarrative = computed(() => resolution.value === 'escalated_to_sar')

const resolutionLabel = computed<Record<string, string>>(() => ({
  false_positive: t('admin.risk.detail.resFalse'),
  escalated_to_sar: t('admin.risk.detail.resSar'),
  frozen_account: t('admin.risk.detail.resFrozen')
}))
</script>

<template>
  <div v-if="data" class="space-y-6 max-w-4xl">
    <NuxtLink to="/admin/risk" class="text-xs text-text-muted hover:text-text">{{ $t('admin.risk.detail.back') }}</NuxtLink>
    <BasePageHeader :title="t('admin.risk.detail.title', { id: data.alert.id })" />

    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.risk.detail.info') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.type') }}</dt><dd>{{ data.alert.type }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.severity') }}</dt><dd>{{ data.alert.severity }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.amount') }}</dt><dd class="num">{{ fmtTwd(data.alert.amount) }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.createdAt') }}</dt><dd class="num">{{ fmtDt(data.alert.createdAt) }}</dd></div>
        <div class="col-span-2"><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.description') }}</dt><dd>{{ data.alert.description }}</dd></div>
        <div v-if="data.alert.relatedTxId" class="col-span-2">
          <dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.relatedTx') }}</dt>
          <dd class="font-mono text-xs">{{ data.alert.relatedTxId }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="data.user" class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.risk.detail.user') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.name') }}</dt><dd>{{ data.user.displayName }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.email') }}</dt><dd>{{ data.user.email }}</dd></div>
        <div><dt class="text-xs text-text-muted">KYC</dt><dd>{{ t('admin.risk.detail.kycLine', { status: data.user.kycStatus, tier: data.user.kycTier }) }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.riskLevel') }}</dt><dd>{{ data.user.riskLevel }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('admin.risk.detail.frozen') }}</dt><dd>{{ data.user.isFrozen ? $t('common.status.frozen') : $t('common.status.normal') }}</dd></div>
      </dl>
      <div class="mt-4">
        <NuxtLink :to="`/admin/users/${data.user.id}`" class="text-xs text-primary-700 hover:underline">
          {{ $t('admin.risk.detail.viewUser') }}
        </NuxtLink>
      </div>
    </section>

    <section v-if="!data.alert.resolvedAt" class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.risk.detail.resolveTitle') }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <button
          v-for="r in (['false_positive','escalated_to_sar','frozen_account'] as const)" :key="r"
          class="p-3 border rounded text-sm text-left"
          :class="resolution === r ? 'border-primary-700 bg-primary-700/5' : 'border-border hover:bg-surface-alt'"
          @click="resolution = r"
        >
          {{ resolutionLabel[r] }}
        </button>
      </div>
      <div v-if="needsNarrative" class="mb-3">
        <BaseTextarea
          v-model="narrative"
          :rows="4"
          :label="$t('admin.risk.detail.narrativeLabel')"
          :placeholder="$t('admin.risk.detail.narrativePlaceholder')"
        />
      </div>
      <div class="mb-3">
        <BaseInput v-model="note" :label="$t('admin.risk.detail.noteLabel')" />
      </div>
      <p v-if="errorMsg" class="text-sm text-danger mb-3">{{ errorMsg }}</p>
      <BaseButton
        variant="primary"
        :disabled="submitting || (needsNarrative && narrative.length === 0)"
        :loading="submitting"
        @click="onResolve"
      >
        {{ submitting ? $t('common.action.processing') : $t('admin.risk.detail.execute') }}
      </BaseButton>
    </section>

    <section v-else class="bg-success/10 border border-success/40 rounded p-6">
      <h2 class="text-sm font-semibold text-success">{{ $t('admin.risk.detail.resolved') }}</h2>
      <div class="mt-2 text-sm space-y-1">
        <div>{{ t('admin.risk.detail.resolvedHow', { resolution: data.alert.resolution }) }}</div>
        <div class="text-xs text-text-muted">{{ data.alert.resolvedBy }} · {{ fmtDt(data.alert.resolvedAt) }}</div>
      </div>
    </section>
  </div>
</template>
