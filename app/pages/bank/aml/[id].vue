<script setup lang="ts">
import type { AmlAlert, User, TrustAccount } from '~~/shared/types'

definePageMeta({ layout: 'bank' })

interface Detail {
  alert: AmlAlert
  user: User | null
  trustAccount: TrustAccount | null
}

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const toast = useToast()
const { t } = useI18n()

const { data, errorMessage, refresh } = await useBankResource<Detail>(() => `/api/bank/aml/${id.value}`)
useHead(() => ({ title: t('bank.head.amlDetail', { id: id.value }) }))

const narrative = ref('')
const submitting = ref(false)

const minLength = 20
const canSubmit = computed(() => narrative.value.trim().length >= minLength && !submitting.value)

async function onEscalate() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await $fetch(`/api/bank/aml/${id.value}/escalate`, {
      method: 'POST',
      body: { narrative: narrative.value }
    })
    toast.success(t('bank.aml.detail.escalateSuccess'))
    await refresh()
    setTimeout(() => router.push('/bank/sar'), 1000)
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    toast.error(e.statusMessage ?? t('bank.aml.detail.escalateError'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
  <div v-else-if="data" class="space-y-6 max-w-4xl">
    <NuxtLink to="/bank/aml" class="text-xs text-text-muted hover:text-text">{{ $t('bank.aml.detail.back') }}</NuxtLink>
    <BasePageHeader :title="t('bank.aml.detail.title', { id: data.alert.id })">
      <template #actions>
        <BaseBadge :variant="riskVariant(data.alert.severity)" size="sm">
          {{ data.alert.severity }}
        </BaseBadge>
      </template>
    </BasePageHeader>

    <section class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.aml.detail.alertInfo') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.type') }}</dt><dd>{{ data.alert.type }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('bank.aml.detail.createdAt') }}</dt><dd class="num">{{ fmtDt(data.alert.createdAt) }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('bank.aml.detail.amount') }}</dt><dd class="num">{{ fmtTwd(data.alert.amount) }}</dd></div>
        <div v-if="data.alert.relatedTxId">
          <dt class="text-xs text-text-muted">{{ $t('bank.aml.detail.relatedTx') }}</dt>
          <dd class="font-mono text-xs">{{ data.alert.relatedTxId }}</dd>
        </div>
        <div class="sm:col-span-2"><dt class="text-xs text-text-muted">{{ $t('bank.aml.detail.description') }}</dt><dd>{{ data.alert.description }}</dd></div>
      </dl>
    </section>

    <section v-if="data.user" class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-4">{{ $t('bank.aml.detail.user') }}</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.name') }}</dt><dd>{{ data.user.displayName }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.email') }}</dt><dd>{{ data.user.email }}</dd></div>
        <div><dt class="text-xs text-text-muted">KYC</dt><dd>{{ t('bank.aml.detail.kycLine', { status: data.user.kycStatus, tier: data.user.kycTier }) }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.label.riskLevel') }}</dt><dd>{{ data.user.riskLevel }}</dd></div>
        <div><dt class="text-xs text-text-muted">{{ $t('common.status.frozen') }}</dt><dd>{{ data.user.isFrozen ? $t('common.status.frozen') : $t('common.status.normal') }}</dd></div>
        <div v-if="data.trustAccount">
          <dt class="text-xs text-text-muted">{{ $t('bank.aml.detail.trustBalance') }}</dt>
          <dd class="num">{{ fmtTwd(data.trustAccount.balance) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="!data.alert.resolvedAt" class="bank-panel p-6">
      <h2 class="bank-heading text-lg mb-3">{{ $t('bank.aml.detail.escalateTitle') }}</h2>
      <p class="text-xs text-text-muted leading-relaxed mb-4">
        {{ t('bank.aml.detail.escalateHint', { min: minLength }) }}
      </p>
      <BaseTextarea
        v-model="narrative"
        :rows="6"
        :label="$t('bank.aml.detail.narrativeLabel')"
        :placeholder="$t('bank.aml.detail.narrativePlaceholder')"
      />
      <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div class="text-xs text-text-muted">
          {{ t('bank.aml.detail.narrativeCount', { n: narrative.trim().length, min: minLength }) }}
        </div>
        <BaseButton
          variant="primary"
          :disabled="!canSubmit"
          :loading="submitting"
          @click="onEscalate"
        >
          {{ submitting ? $t('common.action.processing') : $t('bank.aml.detail.escalateCta') }}
        </BaseButton>
      </div>
    </section>

    <section v-else class="bank-panel p-6 border-success/40">
      <h2 class="bank-heading text-lg mb-2 text-success">{{ $t('bank.aml.detail.resolved') }}</h2>
      <p class="text-sm">{{ t('bank.aml.detail.resolution', { resolution: data.alert.resolution }) }}</p>
      <p class="text-xs text-text-muted mt-2">{{ data.alert.resolvedBy }} · {{ fmtDt(data.alert.resolvedAt) }}</p>
    </section>
  </div>
</template>
