<script setup lang="ts">
import type { User } from '~~/shared/types'

const props = defineProps<{
  user: User
}>()

const { t } = useI18n()

const tierNumber = computed(() => Number(props.user.kycTier.replace('tier', '')))
const tierLabel = computed(() => t('trader.settings.profile.kycTierLabel', { n: tierNumber.value }))

const riskDot: Record<string, string> = {
  low: 'bg-success',
  medium: 'bg-warning',
  high: 'bg-danger',
  critical: 'bg-danger'
}
const kycStatusDot: Record<string, string> = {
  pending: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-danger',
  resubmit: 'bg-warning'
}
</script>

<template>
  <section class="dossier__panel">
    <div class="dossier__sectionHead">
      <span class="dossier__sectionNum">{{ t('trader.settings.profile.section02') }}</span>
    </div>

    <div class="dossier__verifGrid">
      <div class="dossier__cell dossier__cell--tier">
        <div class="dossier__cellLabel">{{ t('trader.settings.profile.field.kycTier') }}</div>
        <div class="dossier__tierStamp" :data-tier="user.kycTier">
          <span class="dossier__tierStampLabel">TIER</span>
          <span class="dossier__tierStampNum">{{ tierNumber }}</span>
        </div>
        <div class="dossier__cellSub">{{ tierLabel }}</div>
      </div>

      <div class="dossier__cell">
        <div class="dossier__cellLabel">{{ t('trader.settings.profile.field.kycStatus') }}</div>
        <div class="dossier__inlineStatus">
          <span class="dossier__statusDot" :class="kycStatusDot[user.kycStatus]" aria-hidden="true" />
          <span class="dossier__cellValue">
            {{ t(`trader.settings.profile.kycStatusLabel.${user.kycStatus}`) }}
          </span>
        </div>
      </div>

      <div class="dossier__cell">
        <div class="dossier__cellLabel">{{ t('trader.settings.profile.field.riskLevel') }}</div>
        <div class="dossier__inlineStatus">
          <span class="dossier__statusDot" :class="riskDot[user.riskLevel]" aria-hidden="true" />
          <span class="dossier__cellValue">
            {{ t(`trader.settings.profile.riskLabel.${user.riskLevel}`) }}
          </span>
        </div>
      </div>

      <div class="dossier__cell">
        <div class="dossier__cellLabel">{{ t('trader.settings.profile.field.twoFa') }}</div>
        <div class="dossier__inlineStatus">
          <Icon
            :name="user.twoFaEnabled ? 'lucide:shield-check' : 'lucide:shield-off'"
            :class="user.twoFaEnabled ? 'text-success' : 'text-text-muted'"
            size="14"
            aria-hidden="true"
          />
          <span class="dossier__cellValue">
            {{ user.twoFaEnabled ? t('trader.settings.profile.twoFaOn') : t('trader.settings.profile.twoFaOff') }}
          </span>
        </div>
      </div>

      <div class="dossier__cell dossier__cell--wide">
        <div class="dossier__cellLabel">{{ t('trader.settings.profile.field.frozen') }}</div>
        <div class="dossier__inlineStatus">
          <span
            class="dossier__statusDot"
            :class="user.isFrozen ? 'bg-danger' : 'bg-success'"
            aria-hidden="true"
          />
          <span class="dossier__cellValue">
            {{ user.isFrozen ? t('trader.settings.profile.frozenLabel') : t('trader.settings.profile.activeLabel') }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
