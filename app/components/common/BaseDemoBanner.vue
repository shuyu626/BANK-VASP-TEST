<script setup lang="ts">
// Persistent top strip that flags this is a non-production demo.
// Lives above the sticky header in each layout — scrolls away with content,
// but always reappears on page enter / scroll-to-top so users can't miss it.
</script>

<template>
  <div class="demo-banner border-b border-border bg-surface-alt">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-warning/15 text-warning font-mono font-bold tracking-wider whitespace-nowrap">
        <Icon name="lucide:flask-conical" size="12" aria-hidden="true" />
        {{ $t('common.demoBanner.label') }}
      </span>
      <span class="hidden md:inline text-text-muted truncate">
        {{ $t('common.demoBanner.detail') }}
      </span>
    </div>
  </div>
</template>
