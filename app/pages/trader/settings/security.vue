<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '~/stores/settings'
import { useSessionStore } from '~/stores/session'

const { t } = useI18n()
useHead(() => ({ title: t('trader.settings.headTitle') }))

const settings = useSettingsStore()
const session = useSessionStore()
const { loginHistory } = storeToRefs(settings)
const { user } = storeToRefs(session)

await settings.loadLoginHistory()

interface FormState {
  submitting: boolean
  error: string | null
  success: string | null
}
function createFormState(): FormState {
  return { submitting: false, error: null, success: null }
}

// 密碼變更
const pwForm = reactive({ old: '', new: '', confirm: '' })
const pwState = reactive<FormState>(createFormState())
const canChangePw = computed(() =>
  pwForm.old.length > 0 &&
  pwForm.new.length >= 8 &&
  /[A-Za-z]/.test(pwForm.new) &&
  /[0-9]/.test(pwForm.new) &&
  pwForm.new === pwForm.confirm &&
  !pwState.submitting
)

async function onChangePassword() {
  pwState.submitting = true
  pwState.error = null
  pwState.success = null
  try {
    await settings.changePassword({ oldPassword: pwForm.old, newPassword: pwForm.new })
    pwForm.old = pwForm.new = pwForm.confirm = ''
    pwState.success = t('trader.settings.security.passwordSuccess')
  } catch (err: unknown) {
    pwState.error = humanize(extractErrorMessage(err))
  } finally {
    pwState.submitting = false
  }
}

// 2FA 切換
const totpForm = reactive({ code: '', password: '' })
const totpState = reactive<FormState>(createFormState())
const twoFaEnabled = computed(() => user.value?.twoFaEnabled ?? false)

async function onToggleTotp() {
  totpState.submitting = true
  totpState.error = null
  totpState.success = null
  try {
    const res = await settings.toggleTotp({
      enable: !twoFaEnabled.value,
      code: totpForm.code,
      password: twoFaEnabled.value ? totpForm.password : null
    })
    await session.init()
    totpForm.code = ''
    totpForm.password = ''
    totpState.success = res.twoFaEnabled
      ? t('trader.settings.security.totpEnabled')
      : t('trader.settings.security.totpDisabled')
  } catch (err: unknown) {
    totpState.error = humanize(extractErrorMessage(err))
  } finally {
    totpState.submitting = false
  }
}

function humanize(code: string): string {
  const map: Record<string, string> = {
    WRONG_PASSWORD: t('trader.settings.security.wrongOld'),
    WRONG_TOTP: t('trader.login.errorWrongTotp'),
    VALIDATION_ERROR: t('trader.register.errorValidation')
  }
  return map[code] ?? code
}
function fmtDtLocal(iso: string) { return iso.slice(0, 19).replace('T', ' ') }
function loginMethod(metadata: Record<string, unknown>): string {
  const method = metadata.method
  return typeof method === 'string' ? method : '—'
}

const loginHistoryColumns = computed(() => [
  { key: 'timestamp', label: t('trader.settings.security.thLoginTime') },
  { key: 'metadata', label: t('trader.settings.security.thLoginMethod') },
  { key: 'ipAddress', label: t('trader.settings.security.thLoginIp') },
  { key: 'resourceId', label: t('trader.settings.security.thLoginSession') }
])
</script>

<template>
  <div class="space-y-8">
    <!-- Change password -->
    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-4">{{ $t('trader.settings.security.passwordTitle') }}</h2>
      <form class="space-y-3 max-w-md" @submit.prevent="onChangePassword">
        <BaseInput
          v-model="pwForm.old"
          type="password"
          autocomplete="current-password"
          :label="$t('trader.settings.security.oldPassword')"
        />
        <BaseInput
          v-model="pwForm.new"
          type="password"
          autocomplete="new-password"
          :label="$t('trader.settings.security.newPassword')"
          :hint="$t('trader.settings.security.passwordWeak')"
        />
        <BaseInput
          v-model="pwForm.confirm"
          type="password"
          autocomplete="new-password"
          :label="$t('trader.settings.security.confirmPassword')"
          :error="pwForm.confirm && pwForm.new !== pwForm.confirm ? $t('trader.settings.security.passwordMismatch') : undefined"
        />
        <p v-if="pwState.error" class="text-sm text-danger">{{ pwState.error }}</p>
        <p v-if="pwState.success" class="text-sm text-success">{{ pwState.success }}</p>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!canChangePw"
          :loading="pwState.submitting"
        >
          {{ pwState.submitting ? $t('common.action.processing') : $t('trader.settings.security.submitCta') }}
        </BaseButton>
      </form>
    </section>

    <!-- 2FA -->
    <section class="trader-panel p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.security.totpTitle') }}</h2>
        <span
          class="inline-flex items-center gap-1.5 font-mono text-[0.7rem] tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm border"
          :class="twoFaEnabled
            ? 'border-success/50 text-success bg-success/10'
            : 'border-warning/50 text-warning bg-warning/10'"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="twoFaEnabled ? 'bg-success' : 'bg-warning'"
            aria-hidden="true"
          />
          {{ twoFaEnabled ? $t('trader.settings.security.totpEnabled') : $t('trader.settings.security.totpDisabled') }}
        </span>
      </div>
      
          
      <div v-if="!twoFaEnabled" class="bg-surface-alt border border-border rounded-md p-4 mb-4 text-xs text-text-muted">
        <div class="font-mono mb-2">{{ $t('trader.settings.security.mockTotpLabel') }} <span class="text-primary-400">DEMO-SECRET</span></div>
        <div>{{ $t('trader.settings.security.totpHint') }}</div>
      </div>

      <form class="space-y-3 max-w-md" @submit.prevent="onToggleTotp">
        <BaseInput
          v-model="totpForm.code"
          inputmode="numeric"
          :maxlength="6"
          :label="$t('trader.settings.security.totpCodeLabel')"
          input-class="num tracking-[0.5em] text-center"
        />
        <BaseInput
          v-if="twoFaEnabled"
          v-model="totpForm.password"
          type="password"
          autocomplete="current-password"
          :label="$t('trader.settings.security.totpPasswordLabel')"
        />
        <p v-if="totpState.error" class="text-sm text-danger">{{ totpState.error }}</p>
        <p v-if="totpState.success" class="text-sm text-success">{{ totpState.success }}</p>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="totpForm.code.length !== 6 || totpState.submitting || (twoFaEnabled && totpForm.password.length === 0)"
          :loading="totpState.submitting"
        >
          {{ totpState.submitting ? $t('common.action.processing') : (twoFaEnabled ? $t('trader.settings.security.totpDisable') : $t('trader.settings.security.totpEnable')) }}
        </BaseButton>
      </form>
    </section>

    <!-- Login history -->
    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-4">{{ $t('trader.settings.security.loginHistoryTitle') }}</h2>
      <BaseTable
        :columns="loginHistoryColumns"
        :items="loginHistory"
        row-key="id"
        paginated
        :default-page-size="10"
        numeric
        :empty-text="$t('trader.settings.security.noLoginHistory')"
        panel-class="bg-transparent border-0 rounded-none"
      >
        <template #cell-timestamp="{ row }">
          <span class="text-text-muted">{{ fmtDtLocal(row.timestamp) }}</span>
        </template>
        <template #cell-metadata="{ row }">
          <span class="text-xs">{{ loginMethod(row.metadata) }}</span>
        </template>
        <template #cell-ipAddress="{ row }">
          <span class="text-xs font-mono">{{ row.ipAddress ?? '—' }}</span>
        </template>
        <template #cell-resourceId="{ row }">
          <span class="text-xs font-mono text-text-muted">{{ row.resourceId }}</span>
        </template>
      </BaseTable>
    </section>
  </div>
</template>
