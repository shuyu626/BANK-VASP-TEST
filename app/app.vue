<script setup lang="ts">
// Root — NuxtLayout lets each page pick its theme (trader / admin / bank / default)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- ClientOnly: dialog 只在點擊後才顯示，無 SSR 需求；亦避開 Teleport-to-body
    與 layout 內 BaseToastHost 在 SSR/CSR 序列順序對不上的 hydration mismatch -->
  <ClientOnly>
    <BaseConfirmHost />
  </ClientOnly>
</template>
