<script setup lang="ts">
import type { UploadedDoc } from '~~/shared/types'

// KYC 表單的單一檔案上傳格子（身分證正/反、自拍、地址證明）。
// 由 v-model 雙向綁定 FileSlot 狀態給父頁面。
export interface FileSlot {
  uploaded: UploadedDoc | null
  previewDataUrl: string | null
  error: string | null
}

const props = withDefaults(defineProps<{
  label: string
  required?: boolean
  hint?: string
  accept?: string
  maxSize?: number  // bytes
  layout?: 'card' | 'inline'
}>(), {
  required: false,
  hint: '',
  accept: 'image/*',
  maxSize: 5 * 1024 * 1024,
  layout: 'card'
})

const model = defineModel<FileSlot>({ required: true })
const { t } = useI18n()

function onChange(ev: Event) {
  const target = ev.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > props.maxSize) {
    model.value = {
      uploaded: null,
      previewDataUrl: null,
      error: t('trader.kyc.fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) })
    }
    target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    model.value = {
      uploaded: {
        filename: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream'
      },
      previewDataUrl: typeof reader.result === 'string' ? reader.result : null,
      error: null
    }
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div :class="layout === 'card' ? 'border border-dashed border-border rounded-md p-4' : ''">
    <div class="text-sm font-medium mb-2">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
      <span v-else-if="hint" class="text-text-muted text-xs">{{ hint }}</span>
    </div>
    <input :accept="accept" type="file" class="text-xs" @change="onChange">
    <p v-if="model.error" class="text-xs text-danger mt-1">{{ model.error }}</p>
    <p v-else-if="model.uploaded" class="text-xs text-success mt-1">
      {{ model.uploaded.filename }}
      <span v-if="layout === 'inline'">· {{ (model.uploaded.size / 1024).toFixed(0) }} KB</span>
    </p>
  </div>
</template>
