<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

definePageMeta({ layout: 'trader' })
const { t } = useI18n()
useHead(() => ({ title: t('trader.head.login') }))

const session = useSessionStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)

const step = ref<'credentials' | 'totp'>('credentials')
const challengeId = ref<string | null>(null)
const totpCode = ref('')

const canSubmit = computed(
  () => email.value.length > 0 && password.value.length > 0 && !submitting.value
)
const canSubmitTotp = computed(
  () => totpCode.value.length === 6 && challengeId.value !== null && !submitting.value
)

// 使用者重新輸入時清除上次錯誤訊息，避免錯誤持續顯示造成困惑
watch([email, password], () => {
  if (formError.value) formError.value = null
})
watch(totpCode, () => {
  if (formError.value) formError.value = null
})

function fillDemo() {
  email.value = 'alice@example.com'
  password.value = 'password'
}

function fillTwoFaDemo() {
  email.value = 'charlie@example.com'
  password.value = 'password'
}

async function onSubmitCredentials() {
  submitting.value = true
  formError.value = null
  try {
    const result = await session.login({ email: email.value, password: password.value })
    if (result.step === 'authenticated') {
      toast.success(t('common.toast.loginSuccess'))
      router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/trader/wallet')
      return
    }
    challengeId.value = result.challengeId ?? null
    step.value = 'totp'
  } catch {
    formError.value = humanizeError(session.error)
  } finally {
    submitting.value = false
  }
}

async function onSubmitTotp() {
  if (!challengeId.value) return
  submitting.value = true
  formError.value = null
  try {
    await session.submitTotp(challengeId.value, totpCode.value)
    toast.success(t('common.toast.loginSuccess'))
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/trader/wallet')
  } catch {
    formError.value = humanizeError(session.error)
    totpCode.value = ''
  } finally {
    submitting.value = false
  }
}

function humanizeError(code: string | null): string {
  switch (code) {
    case 'INVALID_CREDENTIALS': return t('trader.login.errorInvalidCredentials')
    case 'WRONG_TOTP': return t('trader.login.errorWrongTotp')
    case 'CHALLENGE_EXPIRED': return t('trader.login.errorChallengeExpired')
    default: return t('trader.login.errorDefault')
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="trader-panel p-8">
      <h1 class="text-2xl font-bold mb-2">{{ $t('trader.login.title') }}</h1>
      <p class="text-sm text-text-muted mb-6">
        {{ step === 'credentials' ? $t('trader.login.stepCredentials') : $t('trader.login.stepTotp') }}
      </p>

      <form v-if="step === 'credentials'" class="space-y-4" @submit.prevent="onSubmitCredentials">
        <BaseInput
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          :label="$t('common.label.email')"
        />
        <BaseInput
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :label="$t('common.label.password')"
        />

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          block
          :disabled="!canSubmit"
          :loading="submitting"
        >
          {{ submitting ? $t('common.action.loggingIn') : $t('common.action.login') }}
        </BaseButton>
        <div class="flex gap-2">
          <BaseButton variant="secondary" size="sm" block @click="fillDemo">
            {{ $t('trader.login.demoAccount') }}
          </BaseButton>
          <BaseButton variant="secondary" size="sm" block @click="fillTwoFaDemo">
            {{ $t('trader.login.demo2fa') }}
          </BaseButton>
        </div>
      </form>

      <form v-else class="space-y-4" @submit.prevent="onSubmitTotp">
        <BaseInput
          id="totp"
          v-model="totpCode"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="6"
          :label="$t('trader.login.totpLabel')"
          input-class="num tracking-[0.5em] text-center text-lg"
        />

        <p v-if="formError" class="text-sm text-danger">{{ formError }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          block
          :disabled="!canSubmitTotp"
          :loading="submitting"
        >
          {{ submitting ? $t('common.action.verifying') : $t('common.action.confirm') }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" block @click="step = 'credentials'; totpCode = ''; formError = null">
          {{ $t('trader.login.backStep') }}
        </BaseButton>
      </form>

      <div class="mt-6 pt-4 border-t border-border text-center text-sm">
        {{ $t('trader.login.noAccount') }}
        <NuxtLink to="/trader/register" class="text-primary-400 hover:text-primary-300 ml-1">{{ $t('common.action.register') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
