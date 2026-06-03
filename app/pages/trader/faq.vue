<script setup lang="ts">
definePageMeta({ layout: 'trader' })

const { t } = useI18n()
useHead(() => ({ title: t('trader.faq.headTitle') }))

// FAQ 題目 id；對應 i18n 的 trader.faq.q.<id> / trader.faq.a.<id>
const faqItems = ['kyc', 'depositTime', 'withdrawLimit', 'trust', 'fees', 'apiKey'] as const

// 單選模式：預設展開第一題，收合時自動關閉其他題
const openItem = ref<string | null>('kyc')
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold">{{ $t('trader.faq.title') }}</h1>
      <p class="mt-1 text-sm text-text-muted">{{ $t('trader.faq.subtitle') }}</p>
    </header>

    <section class="trader-panel overflow-hidden">
      <p class="px-4 pt-4 text-xs text-text-muted">{{ $t('trader.faq.hint') }}</p>
      <BaseAccordion v-model="openItem" class="mt-2">
        <BaseAccordionPanel
          v-for="id in faqItems"
          :key="id"
          :value="id"
          :summary="$t(`trader.faq.q.${id}`)"
        >
          {{ $t(`trader.faq.a.${id}`) }}
        </BaseAccordionPanel>
      </BaseAccordion>
    </section>
  </div>
</template>
