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

const colorChoices = computed(() => [
  {
    value: 'asian' as const,
    label: t('trader.settings.preferences.marketColorsAsian'),
    up: 'market-swatch-red',
    down: 'market-swatch-green'
  },
  {
    value: 'western' as const,
    label: t('trader.settings.preferences.marketColorsWestern'),
    up: 'market-swatch-green',
    down: 'market-swatch-red'
  }
])
</script>

<template>
  <div class="space-y-6">
    <section class="trader-panel p-6">
      <h2 class="text-lg font-semibold mb-1">{{ $t('trader.settings.preferences.marketColors') }}</h2>
      <p class="text-xs text-text-muted mb-4">
        {{ $t('trader.settings.preferences.marketColorsAsian') }} / {{ $t('trader.settings.preferences.marketColorsWestern') }}
      </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <button
            v-for="c in colorChoices"
            :key="c.value"
            type="button"
            class="relative p-4 border rounded-md text-left transition-all duration-150 focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-primary-500/40"
            :class="prefs.marketColors === c.value
              ? 'border-gold-500 bg-gold-500/[0.08]'
              : 'border-border hover:border-border-strong hover:bg-surface-alt'"
            :aria-pressed="prefs.marketColors === c.value"
            @click="onColorsChange(c.value)"
          >
            <Icon
              v-if="prefs.marketColors === c.value"
              name="lucide:check"
              size="16"
              class="absolute top-3 right-3 text-gold-500"
              aria-hidden="true"
            />
            <div class="text-sm font-medium text-text mb-3 pr-6">{{ c.label }}</div>
            <div class="flex gap-2 text-xs font-mono">
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded" :class="c.up">
                <Icon name="lucide:arrow-up" size="12" aria-hidden="true" /> 1.24%
              </span>
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded" :class="c.down">
                <Icon name="lucide:arrow-down" size="12" aria-hidden="true" /> 0.86%
              </span>
            </div>
          </button>
        </div>
      </section>

      <section class="trader-panel p-6">
        <div class="max-w-xs">
          <BaseSelect
            :model-value="prefs.defaultPair"
            :options="allPairs.map((p) => ({ value: p, label: p.replace('-', '/') }))"
            @update:model-value="onPairChange"
          />
        </div>
      </section>

      <section class="trader-panel p-6">
        <div class="divide-y divide-border max-w-md">
          <label class="flex items-center justify-between gap-4 py-3 cursor-pointer">
            <span class="flex items-center gap-3 text-sm">
              <Icon name="lucide:mail" size="16" class="text-text-muted" aria-hidden="true" />
              {{ $t('trader.settings.preferences.notificationEmail') }}
            </span>
            <BaseCheckbox
              :model-value="prefs.notifications.email"
              @update:model-value="(v) => onNotifChange('email', v)"
            />
          </label>
          <label class="flex items-center justify-between gap-4 py-3 cursor-pointer">
            <span class="flex items-center gap-3 text-sm">
              <Icon name="lucide:monitor-dot" size="16" class="text-text-muted" aria-hidden="true" />
              {{ $t('trader.settings.preferences.notificationInApp') }}
            </span>
            <BaseCheckbox
              :model-value="prefs.notifications.inApp"
              @update:model-value="(v) => onNotifChange('inApp', v)"
            />
          </label>
        </div>
      </section>
  </div>
</template>
