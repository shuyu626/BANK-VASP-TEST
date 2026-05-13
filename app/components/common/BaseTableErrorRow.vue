<script setup lang="ts">
// 給「使用自訂 table（如 bank-table）而不是 BaseTable」的頁面共用的錯誤列。
// BaseTable 已內建相同樣式的錯誤態，使用 BaseTable 時不需要這個元件。
defineProps<{
  colspan: number
  message: string
}>()
defineEmits<{
  retry: []
}>()
</script>

<template>
  <tr>
    <td :colspan="colspan" class="text-center py-10">
      <div class="flex flex-col items-center gap-2 text-text-muted">
        <Icon name="lucide:alert-triangle" size="20" class="text-danger" aria-hidden="true" />
        <div class="text-sm font-medium text-text">{{ $t('components.tableShell.errorTitle') }}</div>
        <div class="text-xs">{{ message }}</div>
        <button
          type="button"
          class="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-surface-alt"
          @click="$emit('retry')"
        >
          <Icon name="lucide:refresh-cw" size="12" aria-hidden="true" />
          {{ $t('components.tableShell.errorRetry') }}
        </button>
      </div>
    </td>
  </tr>
</template>
