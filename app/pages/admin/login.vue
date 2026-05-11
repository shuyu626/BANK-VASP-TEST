<script setup lang="ts">
import { useAdminSessionStore } from '~/stores/admin-session'

definePageMeta({ layout: 'default' })
const { t } = useI18n()
useHead(() => ({ title: t('admin.head.login') }))

const session = useAdminSessionStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('compliance@taiex.local')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

const demos = computed(() => [
  { label: t('admin.login.demoCompliance'), email: 'compliance@taiex.local', role: 'compliance' },
  { label: t('admin.login.demoOps'), email: 'ops@taiex.local', role: 'ops' },
  { label: t('admin.login.demoRisk'), email: 'risk@taiex.local', role: 'risk' }
])

// 使用者重新輸入時清除上次錯誤訊息
watch([email, password], () => {
  if (errorMsg.value) errorMsg.value = null
})

function pick(d: typeof demos.value[number]) {
  email.value = d.email
  password.value = 'admin'
}

async function onSubmit() {
  submitting.value = true
  errorMsg.value = null
  try {
    await session.login({ email: email.value, password: password.value })
    toast.success(t('common.toast.loginSuccess'))
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin')
  } catch (err: unknown) {
    const e = err as { statusMessage?: string }
    errorMsg.value = e.statusMessage === 'INVALID_CREDENTIALS' ? t('admin.login.errorInvalid') : (e.statusMessage ?? t('admin.login.errorDefault'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div data-theme="admin" class="min-h-dvh bg-bg flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-surface border border-border rounded-lg shadow-sm p-8">
      <div class="text-xs tracking-widest text-primary-700 uppercase mb-2">{{ $t('admin.login.kicker') }}</div>
      <h1 class="text-2xl font-bold mb-6 text-neutral-900">{{ $t('admin.login.title') }}</h1>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <BaseInput v-model="email" type="email" autocomplete="email" :label="$t('common.label.email')" />
        <BaseInput v-model="password" type="password" autocomplete="current-password" :label="$t('common.label.password')" />
        <p v-if="errorMsg" class="text-sm text-danger">{{ errorMsg }}</p>
        <BaseButton
          type="submit"
          variant="primary"
          block
          :disabled="submitting || password.length === 0"
          :loading="submitting"
        >
          {{ submitting ? $t('common.action.loggingIn') : $t('common.action.login') }}
        </BaseButton>
      </form>

      <div class="mt-6 pt-6 border-t border-border">
        <div class="text-xs text-text-muted mb-2">{{ $t('admin.login.demoLabel') }}<code class="bg-neutral-100 px-1 rounded">admin</code>{{ $t('admin.login.demoSuffix') }}</div>
        <div class="grid grid-cols-3 gap-2">
          <BaseButton
            v-for="d in demos"
            :key="d.email"
            variant="secondary"
            size="sm"
            @click="pick(d)"
          >
            {{ d.label }}
          </BaseButton>
        </div>
      </div>
      <NuxtLink to="/" class="block text-xs text-center text-text-muted hover:text-text mt-6">{{ $t('nav.backToHub') }}</NuxtLink>
    </div>
  </div>
</template>
