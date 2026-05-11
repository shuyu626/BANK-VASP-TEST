<script setup lang="ts">
// KYC 表單下方的法律依據摺疊區塊。靜態內容、自管 open 狀態。
const open = ref(false)
</script>

<template>
  <div class="border border-border rounded-md">
    <button
      type="button"
      class="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-surface-alt"
      @click="open = !open"
    >
      <span>{{ $t('trader.kyc.legalTitle') }}</span>
      <span class="text-text-muted">{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="px-4 pb-4 text-xs leading-relaxed border-t border-border pt-3 space-y-3">
      <p class="text-text-muted">{{ $t('trader.kyc.legal.intro') }}</p>

      <ol class="space-y-3 list-decimal pl-5 marker:text-text-muted">
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.amlAct7Title') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.amlAct7Body') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.amlAct10Title') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.amlAct10Body') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.vaspReg5Title') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.vaspReg5Body') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.vaspReg6Title') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.vaspReg6Body') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.vaspReg7Title') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.vaspReg7Body') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.vaspActTitle') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.vaspActBody') }}</p>
        </li>
        <li>
          <div class="font-semibold text-text">{{ $t('trader.kyc.legal.items.tierTitle') }}</div>
          <p class="text-text-muted mt-1">{{ $t('trader.kyc.legal.items.tierBody') }}</p>
        </li>
      </ol>

      <p class="text-text-muted text-[11px] italic pt-3 border-t border-border">
        {{ $t('trader.kyc.legal.footer') }}
      </p>
    </div>
  </div>
</template>
