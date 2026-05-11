<script setup lang="ts">
import { RegisterInputSchema } from '~~/shared/types'
import { useSessionStore } from '~/stores/session'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.register') }))

const session = useSessionStore()
const router = useRouter()
const toast = useToast()

const email = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)

// VASP 三件套同意：服務條款 / 隱私政策 / 風險揭露 — 三者皆勾選才放行
const agreedTerms = ref(false)
const agreedPrivacy = ref(false)
const agreedRisk = ref(false)
const allConsented = computed(
  () => agreedTerms.value && agreedPrivacy.value && agreedRisk.value
)

type ConsentKey = 'terms' | 'privacy' | 'risk'
const modalKey = ref<ConsentKey | null>(null)
const modalOpen = computed({
  get: () => modalKey.value !== null,
  set: (v) => { if (!v) modalKey.value = null }
})

function openConsentModal(key: ConsentKey) {
  modalKey.value = key
}

function agreeFromModal() {
  if (modalKey.value === 'terms') agreedTerms.value = true
  else if (modalKey.value === 'privacy') agreedPrivacy.value = true
  else if (modalKey.value === 'risk') agreedRisk.value = true
  modalKey.value = null
}

const consentSections: Record<ConsentKey, readonly string[]> = {
  terms: ['scope', 'kyc', 'trust', 'license', 'termination'],
  privacy: ['collected', 'purpose', 'retention', 'thirdParty', 'rights'],
  risk: ['volatility', 'irreversible', 'custody', 'regulatory', 'operational']
}

const parsed = computed(() => RegisterInputSchema.safeParse({
  email: email.value,
  displayName: displayName.value,
  password: password.value,
  agreedTerms: agreedTerms.value,
  agreedPrivacy: agreedPrivacy.value,
  agreedRisk: agreedRisk.value
}))

const issues = computed(() => {
  if (parsed.value.success) return {}
  const map: Record<string, string> = {}
  for (const issue of parsed.value.error.issues) {
    map[issue.path.join('.')] = issue.message
  }
  return map
})

const passwordsMatch = computed(() =>
  confirmPassword.value.length === 0 || password.value === confirmPassword.value
)

const canSubmit = computed(
  () => parsed.value.success && passwordsMatch.value && !submitting.value
)

function fillDemo() {
  email.value = `demo+${Math.random().toString(36).slice(2, 6)}@example.com`
  displayName.value = 'demo-user'
  password.value = 'demo1234'
  confirmPassword.value = 'demo1234'
}

async function onSubmit() {
  if (!parsed.value.success) {
    if (!allConsented.value) formError.value = t('trader.register.errorConsentRequired')
    return
  }
  submitting.value = true
  formError.value = null
  try {
    await session.register(parsed.value.data)
    toast.success(t('common.toast.registerSuccess'))
    router.push('/trader/kyc')
  } catch {
    formError.value = session.error ?? t('trader.register.errorDefault')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="trader-panel p-8">
      <h1 class="text-2xl font-bold mb-2">{{ $t('trader.register.title') }}</h1>
      <p class="text-sm text-text-muted mb-6">
        {{ $t('trader.register.passwordHint') }}
      </p>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <BaseInput
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          :label="$t('trader.register.emailLabel')"
          :error="email ? issues.email : undefined"
        />

        <BaseInput
          id="displayName"
          v-model="displayName"
          type="text"
          autocomplete="name"
          :label="$t('trader.register.displayNameLabel')"
          :placeholder="$t('trader.register.displayNamePlaceholder')"
          :error="displayName ? issues.displayName : undefined"
        />

        <BaseInput
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          :label="$t('trader.register.passwordLabel')"
          :hint="$t('trader.register.passwordHint')"
          :error="password ? issues.password : undefined"
        />

        <BaseInput
          id="confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          :label="$t('trader.settings.security.confirmPassword')"
          :error="!passwordsMatch ? $t('trader.settings.security.passwordMismatch') : undefined"
        />

        <fieldset class="rounded-md border border-border bg-surface-alt/50 p-4 space-y-3">
          <legend class="px-1 text-xs uppercase tracking-wider text-text-muted font-semibold">
            {{ $t('trader.register.consent.title') }}
          </legend>

          <BaseCheckbox v-model="agreedTerms">
            <span class="text-sm leading-relaxed">
              {{ $t('trader.register.consent.agreeBefore') }}
              <button
                type="button"
                class="text-primary-400 hover:text-primary-300 underline underline-offset-2 mx-1"
                @click.stop="openConsentModal('terms')"
              >{{ $t('trader.register.consent.termsLink') }}</button>
            </span>
          </BaseCheckbox>

          <BaseCheckbox v-model="agreedPrivacy">
            <span class="text-sm leading-relaxed">
              {{ $t('trader.register.consent.agreeBefore') }}
              <button
                type="button"
                class="text-primary-400 hover:text-primary-300 underline underline-offset-2 mx-1"
                @click.stop="openConsentModal('privacy')"
              >{{ $t('trader.register.consent.privacyLink') }}</button>
            </span>
          </BaseCheckbox>

          <BaseCheckbox v-model="agreedRisk">
            <span class="text-sm leading-relaxed">
              {{ $t('trader.register.consent.agreeBefore') }}
              <button
                type="button"
                class="text-primary-400 hover:text-primary-300 underline underline-offset-2 mx-1"
                @click.stop="openConsentModal('risk')"
              >{{ $t('trader.register.consent.riskLink') }}</button>
            </span>
          </BaseCheckbox>

          <p
            v-if="!allConsented"
            class="text-[11px] text-text-muted leading-relaxed pt-1"
          >
            {{ $t('trader.register.consent.mustAgreeAll') }}
          </p>
        </fieldset>

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          block
          :disabled="!canSubmit"
          :loading="submitting"
        >
          {{ submitting ? $t('trader.register.submitting') : $t('trader.register.submitCta') }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" block @click="fillDemo">
          {{ $t('trader.login.demoAccount') }}
        </BaseButton>
      </form>

      <div class="mt-6 pt-4 border-t border-border text-center text-sm">
        {{ $t('trader.register.haveAccount') }}
        <NuxtLink to="/trader/login" class="text-primary-400 hover:text-primary-300 ml-1">{{ $t('trader.register.loginLink') }}</NuxtLink>
      </div>
    </div>

    <BaseModal v-model="modalOpen" width="lg">
      <template #title>
        <span v-if="modalKey">{{ $t(`trader.register.consent.modal.${modalKey}.title`) }}</span>
      </template>

      <template v-if="modalKey">
        <p class="text-xs text-warning bg-warning/10 border border-warning/30 rounded-sm px-3 py-2 mb-4 leading-relaxed">
          {{ $t('trader.register.consent.demoNotice') }}
        </p>
        <p class="text-sm text-text mb-4 leading-relaxed">
          {{ $t(`trader.register.consent.modal.${modalKey}.intro`) }}
        </p>
        <ul class="space-y-2.5 text-sm leading-relaxed text-text">
          <li
            v-for="key in consentSections[modalKey]"
            :key="key"
            class="flex gap-2"
          >
            <span class="shrink-0 text-primary-400 mt-0.5" aria-hidden="true">›</span>
            <span>{{ $t(`trader.register.consent.modal.${modalKey}.${key}`) }}</span>
          </li>
        </ul>
      </template>

      <template #footer="{ close }">
        <BaseButton variant="primary" @click="agreeFromModal">
          {{ $t('trader.register.consent.modal.actionAgree') }}
        </BaseButton>
        <BaseButton variant="secondary" @click="close">
          {{ $t('trader.register.consent.modal.actionClose') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
