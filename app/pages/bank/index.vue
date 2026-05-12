<script setup lang="ts">
import type { AmlAlert } from '~~/shared/types'

definePageMeta({ layout: 'bank' })
const { t } = useI18n()
useHead(() => ({ title: t('bank.head.dashboard') }))

interface DashboardData {
  today: { date: string; depositCount: number; withdrawCount: number; depositAmount: number; withdrawAmount: number }
  trust: { totalBalance: number; accountCount: number }
  compliance: { ctrDraft: number; sarUnderReview: number; openAlerts: number; pendingKycMatch: number }
  openAlerts: { alert: AmlAlert; user: { id: string; displayName: string } | null }[]
}

const { data, errorMessage, refresh } = await useBankResource<DashboardData>('/api/bank/dashboard')
</script>

<template>
  <BasePageError v-if="errorMessage" :message="errorMessage" @retry="refresh" />
  <div v-else-if="data" class="space-y-10">
    <header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-6">
      <div class="min-w-0">
        <div class="text-xs tracking-[0.3em] uppercase text-text-muted mb-2">{{ $t('bank.dashboard.kicker') }}</div>
        <h1 class="bank-heading text-2xl sm:text-3xl">{{ $t('bank.dashboard.title') }}</h1>
        <p class="text-text-muted text-sm mt-2">
          {{ t('bank.dashboard.subtitle', { date: data.today.date }) }}
        </p>
      </div>
      <div class="flex gap-3 items-center shrink-0">
        <span class="bank-stamp">{{ $t('bank.demoStamp') }}</span>
        <BaseButton variant="secondary" size="sm" @click="refresh()">
          {{ $t('common.action.refresh') }}
        </BaseButton>
      </div>
    </header>

    <section class="grid md:grid-cols-4 gap-4">
      <BaseKpi
        theme="bank"
        :label="$t('bank.dashboard.kpiTrustTotal')"
        :value="fmtTwd(data.trust.totalBalance)"
        :hint="t('bank.dashboard.kpiAccountCount', { count: data.trust.accountCount })"
      />
      <BaseKpi
        theme="bank"
        :label="$t('bank.dashboard.kpiTodayIn')"
        :value="fmtTwd(data.today.depositAmount)"
        :hint="t('bank.dashboard.kpiCount', { count: data.today.depositCount })"
      />
      <BaseKpi
        theme="bank"
        :label="$t('bank.dashboard.kpiTodayOut')"
        :value="fmtTwd(data.today.withdrawAmount)"
        :hint="t('bank.dashboard.kpiCount', { count: data.today.withdrawCount })"
      />
      <BaseKpi
        theme="bank"
        :tone="data.compliance.openAlerts > 0 ? 'warning' : 'default'"
        :label="$t('bank.dashboard.kpiCompliance')"
        :value="data.compliance.openAlerts + data.compliance.ctrDraft + data.compliance.sarUnderReview"
        :hint="t('bank.dashboard.kpiComplianceBreakdown', { aml: data.compliance.openAlerts, ctr: data.compliance.ctrDraft, sar: data.compliance.sarUnderReview })"
      />
    </section>

    <section class="grid md:grid-cols-2 gap-6">
      <div class="bank-panel p-5">
        <h2 class="bank-heading text-lg mb-3">{{ $t('bank.dashboard.shortcuts') }}</h2>
        <ul class="space-y-2 text-sm">
          <li><NuxtLink to="/bank/trust-accounts" class="hover:underline">{{ $t('bank.dashboard.shortcutTrust') }}</NuxtLink></li>
          <li>
            <NuxtLink to="/bank/kyc-match" class="hover:underline">{{ $t('bank.dashboard.shortcutKycMatch') }}</NuxtLink>
            <span v-if="data.compliance.pendingKycMatch > 0" class="ml-2 bank-stamp bank-gold-accent">{{ t('bank.dashboard.shortcutKycMatchPending', { count: data.compliance.pendingKycMatch }) }}</span>
          </li>
          <li><NuxtLink to="/bank/reconciliation" class="hover:underline">{{ $t('bank.dashboard.shortcutReconciliation') }}</NuxtLink></li>
          <li>
            <NuxtLink to="/bank/aml" class="hover:underline">{{ $t('bank.dashboard.shortcutAml') }}</NuxtLink>
            <span v-if="data.compliance.openAlerts > 0" class="ml-2 bank-stamp bank-gold-accent">{{ t('bank.dashboard.shortcutAmlOpen', { count: data.compliance.openAlerts }) }}</span>
          </li>
          <li><NuxtLink to="/bank/ctr" class="hover:underline">{{ $t('bank.dashboard.shortcutCtr') }}</NuxtLink></li>
          <li><NuxtLink to="/bank/sar" class="hover:underline">{{ $t('bank.dashboard.shortcutSar') }}</NuxtLink></li>
          <li><NuxtLink to="/bank/regulator-reports" class="hover:underline">{{ $t('bank.dashboard.shortcutRegulator') }}</NuxtLink></li>
        </ul>
      </div>

      <div class="bank-panel p-5">
        <h2 class="bank-heading text-lg mb-3 flex items-center gap-3">
          {{ $t('bank.dashboard.openAmlTitle') }}
          <span v-if="data.openAlerts.length > 0" class="bank-stamp bank-gold-accent">{{ t('bank.dashboard.openAmlBadge', { count: data.openAlerts.length }) }}</span>
        </h2>
        <div v-if="data.openAlerts.length === 0" class="text-sm text-text-muted py-4 text-center">{{ $t('bank.dashboard.noOpenAml') }}</div>
        <ul v-else class="space-y-2 text-sm">
          <li v-for="a in data.openAlerts.slice(0, 5)" :key="a.alert.id" class="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
            <div class="min-w-0">
              <div class="font-medium truncate">{{ a.user?.displayName ?? a.alert.userId }}</div>
              <div class="text-xs text-text-muted truncate">{{ a.alert.description }}</div>
            </div>
            <BaseBadge :variant="riskVariant(a.alert.severity)">{{ a.alert.severity }}</BaseBadge>
          </li>
        </ul>
        <NuxtLink to="/bank/aml" class="block text-xs text-text-muted hover:text-text mt-3">{{ $t('bank.dashboard.viewAll') }}</NuxtLink>
      </div>
    </section>
  </div>
</template>
