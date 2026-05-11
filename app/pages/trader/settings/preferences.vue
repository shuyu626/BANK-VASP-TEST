<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
useHead(() => ({ title: t('trader.settings.headTitle') }))

const { prefs, update } = useTraderPrefs()

const allPairs = [
  'BTC-TWD', 'ETH-TWD', 'USDT-TWD', 'SOL-TWD',
  'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT', 'ADA-USDT', 'DOGE-USDT', 'AVAX-USDT'
]

function saved() {
  toast.success(t('trader.settings.preferences.saveSuccess'), 1500)
}

function onColorsChange(v: 'asian' | 'western') {
  update({ marketColors: v })
  saved()
}
function onPairChange(v: string) {
  update({ defaultPair: v })
  saved()
}
function onNotifChange(k: 'email' | 'inApp', v: boolean) {
  update({ notifications: { ...prefs.value.notifications, [k]: v } })
  saved()
}
</script>

<template>
  <div class="space-y-6">
    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.preferences.marketColors') }}</h2>
      <p class="text-xs text-text-muted mb-4">
        {{ $t('trader.settings.preferences.marketColorsAsian') }} / {{ $t('trader.settings.preferences.marketColorsWestern') }}
      </p>
      <div class="grid grid-cols-2 gap-3 max-w-md">
        <button
          type="button"
          class="p-4 border rounded-md text-left transition"
          :class="prefs.marketColors === 'asian' ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:bg-surface-alt'"
          @click="onColorsChange('asian')"
        >
          <div class="font-semibold mb-2">{{ $t('trader.settings.preferences.marketColorsAsian') }}</div>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 rounded" style="background:#d93838;color:white;">+ ↑</span>
            <span class="px-2 py-1 rounded" style="background:#11866f;color:white;">− ↓</span>
          </div>
        </button>
        <button
          type="button"
          class="p-4 border rounded-md text-left transition"
          :class="prefs.marketColors === 'western' ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:bg-surface-alt'"
          @click="onColorsChange('western')"
        >
          <div class="font-semibold mb-2">{{ $t('trader.settings.preferences.marketColorsWestern') }}</div>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 rounded" style="background:#11866f;color:white;">+ ↑</span>
            <span class="px-2 py-1 rounded" style="background:#d93838;color:white;">− ↓</span>
          </div>
        </button>
      </div>
    </section>

    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.preferences.defaultPair') }}</h2>
      <div class="max-w-xs">
        <BaseSelect
          :model-value="prefs.defaultPair"
          :options="allPairs.map((p) => ({ value: p, label: p.replace('-', '/') }))"
          @update:model-value="onPairChange"
        />
      </div>
    </section>

    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.preferences.title') }}</h2>
      <div class="py-2">
        <BaseCheckbox
          :model-value="prefs.notifications.email"
          :label="$t('trader.settings.preferences.notificationEmail')"
          @update:model-value="(v) => onNotifChange('email', v)"
        />
      </div>
      <div class="py-2">
        <BaseCheckbox
          :model-value="prefs.notifications.inApp"
          :label="$t('trader.settings.preferences.notificationInApp')"
          @update:model-value="(v) => onNotifChange('inApp', v)"
        />
      </div>
    </section>
  </div>
</template>
