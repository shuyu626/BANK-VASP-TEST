<script setup lang="ts">
import type { KycRecord, User, KycTier } from '~~/shared/types'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const { t } = useI18n()

interface Detail { record: KycRecord; user?: User }
const { data, refresh } = await useFetch<Detail>(() => `/api/admin/kyc/${id.value}`, {
  headers: ssrCookieHeaders()
})

useHead(() => ({ title: t('admin.kyc.detail.title', { id: id.value }) + ' — Admin' }))

const submitting = ref(false)
const errorMsg = ref<string | null>(null)
const selectedTier = ref<KycTier>('tier1')
const rejectReason = ref('')
const rejectConfirming = ref(false)

watch(() => data.value?.record, (r) => {
  if (r?.tier && r.tier !== 'tier0') selectedTier.value = r.tier
}, { immediate: true })

async function onApprove() {
  if (!data.value) return
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch(`/api/admin/kyc/${id.value}/approve`, {
      method: 'POST', body: { tier: selectedTier.value }
    })
    await refresh()
    router.push('/admin/kyc')
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    errorMsg.value = e.statusMessage ?? t('admin.kyc.detail.approveError')
  } finally {
    submitting.value = false
  }
}

function openRejectConfirm() {
  if (rejectReason.value.trim().length < 10) {
    errorMsg.value = t('admin.kyc.detail.rejectReasonTooShort')
    return
  }
  errorMsg.value = null
  rejectConfirming.value = true
}

async function onReject() {
  if (!data.value || rejectReason.value.length === 0) return
  submitting.value = true
  errorMsg.value = null
  try {
    await $fetch(`/api/admin/kyc/${id.value}/reject`, {
      method: 'POST', body: { reason: rejectReason.value }
    })
    await refresh()
    rejectConfirming.value = false
    router.push('/admin/kyc')
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    errorMsg.value = e.statusMessage ?? t('admin.kyc.detail.rejectError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="data" class="space-y-6 max-w-4xl">
    <BasePageHeader :title="t('admin.kyc.detail.title', { id: data.record.id })">
      <template #actions>
        <BaseBadge :variant="kycVariant(data.record.status)" size="sm">
          {{ data.record.status }}
        </BaseBadge>
      </template>
    </BasePageHeader>
    <NuxtLink to="/admin/kyc" class="text-xs text-text-muted hover:text-text">{{ $t('admin.kyc.detail.back') }}</NuxtLink>

    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.kyc.detail.userInfo') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.userId') }}</dt><dd class="font-mono">{{ data.user?.id }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.email') }}</dt><dd>{{ data.user?.email }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.name') }}</dt><dd>{{ data.user?.displayName }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.registerTime') }}</dt><dd class="num">{{ fmtDt(data.user?.createdAt ?? null) }}</dd></div>
      </dl>
    </section>

    <section class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.kyc.detail.submitInfo') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.idNumber') }}</dt><dd class="font-mono num">{{ data.record.idNumber }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.birthDate') }}</dt><dd>{{ data.record.birthDate }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.phone') }}</dt><dd>{{ data.record.phone }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.address') }}</dt><dd>{{ data.record.address }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.submitTime') }}</dt><dd class="num">{{ fmtDt(data.record.submittedAt) }}</dd></div>
        <div><dt class="text-xs text-text-muted mb-1">{{ $t('common.label.tier') }}</dt><dd>{{ data.record.tier }}</dd></div>
      </dl>
      <div class="mt-4 pt-4 border-t border-border">
        <div class="text-xs text-text-muted mb-2">{{ $t('admin.kyc.detail.files') }}</div>
        <ul class="text-xs font-mono space-y-1">
          <li>{{ $t('admin.kyc.detail.fileFront') }}{{ data.record.docIdFrontUrl }}</li>
          <li>{{ $t('admin.kyc.detail.fileBack') }}{{ data.record.docIdBackUrl }}</li>
          <li>{{ $t('admin.kyc.detail.fileSelfie') }}{{ data.record.docSelfieUrl }}</li>
          <li v-if="data.record.docProofOfAddressUrl">{{ $t('admin.kyc.detail.fileProof') }}{{ data.record.docProofOfAddressUrl }}</li>
        </ul>
      </div>
    </section>

    <section v-if="data.record.status === 'pending'" class="bg-surface border border-border rounded p-6">
      <h2 class="text-sm font-semibold mb-4">{{ $t('admin.kyc.detail.decision') }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-xs font-semibold text-success mb-3">{{ $t('admin.kyc.detail.approveTitle') }}</h3>
          <BaseSelect
            v-model="selectedTier"
            :label="$t('admin.kyc.detail.tierLabel')"
            :options="[
              { value: 'tier1', label: $t('admin.kyc.detail.tier1') },
              { value: 'tier2', label: $t('admin.kyc.detail.tier2') }
            ]"
          />
          <BaseButton
            variant="primary"
            block
            class="mt-3 !bg-success"
            :disabled="submitting"
            :loading="submitting"
            @click="onApprove"
          >
            {{ submitting ? $t('common.action.processing') : $t('admin.kyc.detail.approveCta') }}
          </BaseButton>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-danger mb-3">{{ $t('admin.kyc.detail.rejectTitle') }}</h3>
          <BaseTextarea
            v-model="rejectReason"
            :rows="3"
            :label="$t('admin.kyc.detail.rejectReasonLabel')"
            :placeholder="$t('admin.kyc.detail.rejectReasonPlaceholder')"
          />
          <BaseButton
            variant="danger"
            block
            class="mt-3"
            :disabled="submitting || rejectReason.length === 0"
            :loading="submitting"
            @click="openRejectConfirm"
          >
            {{ submitting ? $t('common.action.processing') : $t('admin.kyc.detail.rejectCta') }}
          </BaseButton>
        </div>
      </div>
      <p v-if="errorMsg" class="text-sm text-danger mt-3">{{ errorMsg }}</p>
    </section>

    <section v-else-if="data.record.status === 'rejected'" class="bg-danger/10 border border-danger/40 rounded p-6">
      <h2 class="text-sm font-semibold text-danger mb-2">{{ $t('admin.kyc.detail.rejected') }}</h2>
      <p class="text-sm">{{ t('admin.kyc.detail.rejectedReason', { reason: data.record.rejectReason ?? '' }) }}</p>
      <p class="text-xs text-text-muted mt-2">{{ t('admin.kyc.detail.reviewer', { by: data.record.reviewerId ?? '', at: fmtDt(data.record.reviewedAt) }) }}</p>
    </section>

    <section v-else class="bg-success/10 border border-success/40 rounded p-6">
      <h2 class="text-sm font-semibold text-success mb-2">{{ $t('admin.kyc.detail.approved') }}</h2>
      <p class="text-sm">{{ t('admin.kyc.detail.approvedTier', { tier: data.record.tier }) }}</p>
      <p class="text-xs text-text-muted mt-2">{{ t('admin.kyc.detail.reviewer', { by: data.record.reviewerId ?? '', at: fmtDt(data.record.reviewedAt) }) }}</p>
    </section>

    <BaseModal v-model="rejectConfirming" :title="$t('admin.kyc.detail.rejectConfirmTitle')" width="md">
      <div class="mb-4 p-3 rounded bg-danger/10 border border-danger/40 text-xs text-danger">
        <Icon name="lucide:triangle-alert" class="inline align-middle mr-1" size="14" aria-hidden="true" />{{ $t('admin.kyc.detail.rejectConfirmWarn') }}
      </div>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-text-muted">{{ $t('common.label.user') }}</dt>
          <dd class="font-semibold">{{ data.user?.displayName }}</dd>
        </div>
        <div>
          <dt class="text-text-muted text-xs mb-1">{{ $t('admin.kyc.detail.rejectReasonLabel') }}</dt>
          <dd class="text-sm border border-border rounded p-2 bg-neutral-50 whitespace-pre-wrap">{{ rejectReason }}</dd>
        </div>
      </dl>
      <template #footer="{ close }">
        <BaseButton variant="secondary" block :disabled="submitting" @click="close">
          {{ $t('common.action.cancel') }}
        </BaseButton>
        <BaseButton variant="danger" block :disabled="submitting" :loading="submitting" @click="onReject">
          {{ submitting ? $t('common.action.processing') : $t('admin.kyc.detail.rejectCta') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
