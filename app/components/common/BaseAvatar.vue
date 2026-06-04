<script setup lang="ts">
// 單一頭像元件。
// 設計重點：
//   1. 載入失敗偵測：用 <img> 原生 @error 切換 fallback，零額外請求、
//      不影響 loading="lazy"，SSR ↔ CSR 初次都渲染 <img>，無 hydration mismatch。
//   2. 尺寸統一解析成像素數字，同時供 CSS 變數與 <img> width/height 使用，避免 CLS。
//   3. 字級隨頭像大小等比縮放。
//   4. 壞圖補強：圖片若在 @error 掛上前就已載入失敗（如 SSR 階段），事件不會補觸發，
//      故掛載後與 src 變動後主動檢查 img.complete && naturalWidth === 0。

import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'

import type { CSSProperties, ImgHTMLAttributes } from 'vue'

import { isNumberish, toUnit } from '~/utils/unit'

interface BaseAvatarProps {
  /** 尺寸：語意關鍵字或像素數字（'40' / 40） */
  size?: 'small' | 'medium' | 'large' | `${number}` | number
  /** 圓角：'full'（圓形）或像素數字 */
  rounded?: `${number}` | number | 'full'
  /** 圖片網址；未提供時直接渲染 default slot（通常是縮寫文字） */
  src?: string
  /** 圖片替代文字；同時作為 fallback 的預設內容 */
  alt?: string
  /** 原生 <img> loading 策略 */
  loading?: ImgHTMLAttributes['loading']
}

const props = withDefaults(defineProps<BaseAvatarProps>(), {
  size: 'medium',
  rounded: 'full',
  src: undefined,
  alt: undefined,
  loading: 'lazy',
})

// 具名尺寸對應的像素值（與舊版 SCSS 的 24 / 40 / 56 保持一致）
const SIZE_MAP = { small: 24, medium: 40, large: 56 } as const

// 圖片是否載入失敗 → 切換到 fallback
const isError = ref(false)
const imgEl = useTemplateRef('imgEl')

// 檢查「已載入但解碼失敗」的壞圖（含 SSR 階段就失敗、@error 來不及監聽的情況）
function syncCachedError() {
  const el = imgEl.value
  if (el && el.complete && el.naturalWidth === 0) {
    isError.value = true
  }
}

// src 變動時先重置錯誤狀態讓新圖重試，再於 DOM 更新後補檢查一次快取壞圖
watch(() => props.src, () => {
  isError.value = false
  nextTick(syncCachedError)
})

// 掛載後補檢查：涵蓋 SSR 既有 <img> 在 hydration 前就載入失敗的缺口
onMounted(syncCachedError)

// 把尺寸統一解析成像素數字，供 CSS 變數與 <img> 寬高共用
const resolvedPx = computed(() =>
  isNumberish(props.size) ? Number(props.size) : SIZE_MAP[props.size as keyof typeof SIZE_MAP],
)

const style = computed<CSSProperties>(() => ({
  '--avatar-size': `${resolvedPx.value}px`,
  width: 'var(--avatar-size)',
  height: 'var(--avatar-size)',
  // 'full' → 9999px（圓形）；其餘交給 toUnit 補單位
  borderRadius: props.rounded === 'full' ? '9999px' : toUnit(props.rounded),
  // 文字尺寸隨頭像等比縮放
  fontSize: 'calc(var(--avatar-size) * 0.4)',
}))
</script>

<template>
  <span
    class="base-avatar inline-flex items-center justify-center overflow-hidden select-none bg-surface-alt text-text-muted font-bold leading-none"
    :style="style"
  >
    <template v-if="src">
      <img
        v-if="!isError"
        ref="imgEl"
        :src="src"
        :alt="alt"
        :width="resolvedPx"
        :height="resolvedPx"
        :loading="loading"
        class="w-full h-full object-cover"
        decoding="async"
        draggable="false"
        @error="isError = true"
        @load="isError = false"
      >
      <!-- 載入失敗 → fallback slot；沒給 fallback 就退回 default slot，再退回 alt 文字 -->
      <!-- a11y：有 alt 時把縮寫視為裝飾、改用 aria-label 報讀完整名稱；無 alt 才讓內文被報讀 -->
      <span v-else :role="alt ? 'img' : undefined" :aria-label="alt || undefined">
        <slot name="fallback">
          <slot>{{ alt }}</slot>
        </slot>
      </span>
    </template>
    <!-- 無 src → 直接渲染 default slot（通常是姓名縮寫） -->
    <span v-else :role="alt ? 'img' : undefined" :aria-label="alt || undefined">
      <slot />
    </span>
  </span>
</template>
