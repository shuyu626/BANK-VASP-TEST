<script lang="ts">
// ─────────────────────────────────────────────────────────────────────────
// BaseScrollbar — 覆蓋式自訂捲軸
//
// 作用：隱藏瀏覽器原生捲軸，改用可拖曳的 thumb（捲軸滑塊）
// 結構：根節點 .base-scrollbar（overflow: hidden）包住一個會捲動的
// .base-scrollbar__viewport，再用兩個絕對定位的 track（垂直 / 水平）疊在上面。
// ─────────────────────────────────────────────────────────────────────────

const GAP = 4 // thumb 與容器邊緣保留的間距（px）
const MIN_SIZE = 20 // thumb 的最小長度（px），避免內容超長時 thumb 縮到看不見

// 垂直 / 水平兩種方向共用同一套計算邏輯，差別只在於要讀寫哪些 DOM 屬性。
const ORIENTATION_MAP = {
  vertical: {
    size: 'offsetHeight', // 可視長度
    scroll: 'scrollTop', // 捲動位移
    scrollSize: 'scrollHeight', // 內容總長度
    page: 'pageY', // 滑鼠座標軸
    direction: 'top', // track 在該軸的起點邊
  },
  horizontal: {
    size: 'offsetWidth',
    scroll: 'scrollLeft',
    scrollSize: 'scrollWidth',
    page: 'pageX',
    direction: 'left',
  },
} as const

type Orientation = typeof ORIENTATION_MAP
type OrientationKey = keyof Orientation
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, useId, useTemplateRef } from 'vue'
import { useResizeObserver } from '@vueuse/core'

interface BaseScrollbarProps {
  /** 退回平台原生捲軸（不渲染自訂 thumb） */
  native?: boolean
}

const props = withDefaults(defineProps<BaseScrollbarProps>(), {
  native: false,
})

// 給 viewport 一個唯一 id，讓 track 的 aria-controls 能正確指向被捲動的容器
const id = useId()

const active = ref(false) // 捲軸是否顯示中（滑過或捲動時為 true）
const dragging = ref(false) // 是否正在拖曳 thumb

const viewportRef = useTemplateRef<HTMLElement>('viewportRef')

// 自動隱藏捲軸的計時器
let time: ReturnType<typeof setTimeout>

// ── 拖曳過程的暫存狀態 ──
// 這些是命令式的暫存值，不需要響應式，所以用普通 let 而非 ref（避免無謂的重渲染）。
let currentOrientation: Orientation[OrientationKey] | null = null // 當前拖曳的方向設定
let mousePosition = 0 // 按下時的滑鼠座標
let scrollOffset: number | null = null // 按下時的捲動位移

// 拖曳時會暫時把 document.onselectstart 關掉以避免選到文字，這裡先存原值好還原。
// 用 `typeof document.onselectstart` 標型別（而非 any）以符合 strict；SSR 無 window 時給 null。
let originalOnSelectStart: typeof document.onselectstart =
  typeof window !== 'undefined' ? document.onselectstart : null

// 排定 1 秒後自動隱藏捲軸（每次捲動都會重設，等使用者停手才真正淡出）
const scheduleHideScrollbar = () => {
  if (time) {
    clearTimeout(time)
  }
  // 建立新的計時器
  time = setTimeout(() => {
    active.value = false
  }, 1000)
}

// 在 thumb 上按下 → 開始拖曳
const onThumbPointerdown = (event: PointerEvent, orientation: OrientationKey) => {
  event.stopPropagation() // 阻止冒泡到 track，否則會誤觸「點擊軌道跳轉」

  if (event.ctrlKey || event.button !== 0) return // 只處理滑鼠左鍵
  if (!viewportRef.value) return

  const { page, scroll } = (currentOrientation = ORIENTATION_MAP[orientation])

  mousePosition = event[page] // 按下瞬間滑鼠的座標
  scrollOffset = viewportRef.value[scroll] // 按下瞬間容器捲到哪個位置

  window.getSelection()?.removeAllRanges() // 拖曳前清掉既有文字選取

  // 拖曳期間禁止選取文字
  originalOnSelectStart = document.onselectstart
  document.onselectstart = () => false

  // 監聽掛在 document 上，這樣即使滑鼠移出 thumb 仍能持續拖曳
  document.addEventListener('pointermove', onDocumentPointermove)
  document.addEventListener('pointerup', onDocumentPointerup)
}

// 滑入軌道 → 顯示捲軸並取消自動隱藏
const onTrackPointerenter = () => {
  active.value = true
  time && clearTimeout(time)
}

// 滑出軌道 → 重新排定自動隱藏
const onTrackPointerleave = scheduleHideScrollbar

// 點擊軌道空白處 → 讓 thumb 中心跳到點擊位置
const onTrackPointerdown = (event: PointerEvent, orientation: OrientationKey) => {
  const viewport = viewportRef.value
  if (!viewport) return

  const { scroll, scrollSize, size, page, direction } = ORIENTATION_MAP[orientation]

  const track = event.currentTarget as HTMLElement
  const thumb = track.childNodes[0] as HTMLElement // 假設了「thumb 是 track 的第一個子元素」

  const rect = track.getBoundingClientRect() // 回傳 track 相對於 viewport 的位置與尺寸

  // 以「點擊點 - thumb 半長」換算成對應的內容捲動位置（讓 thumb 中心對齊游標）
  const thumbHalf = thumb[size] / 2
  // 計算點擊點距離 track 起點有多遠
  // rect[direction] -  track 上緣在視窗中的座標。
  // event[page](event.pageY) - 點擊處的座標
  const position = Math.abs(rect[direction] - event[page])

  viewport[scroll] = (position - thumbHalf) * (viewport[scrollSize] / track[size]) // 「thumb 上緣在 track 上的目標位置」乘上「track→內容的比例」
}

// 拖曳中：把滑鼠位移量換算成內容捲動量
const onDocumentPointermove = (event: PointerEvent) => {
  if (!currentOrientation) return

  const viewport = viewportRef.value
  if (!viewport) return

  dragging.value = true

  const { page, scroll, scrollSize, size } = currentOrientation

  // 位移比例 = 滑鼠移動距離 / 可視長度，再乘上內容總長度得到實際捲動量
  const offset = (event[page] - mousePosition) / (viewport[size] - GAP)
  // 比例換算成實際捲動位置,寫進 scroll 讓畫面捲過去
  viewport[scroll] = scrollOffset! + offset * viewport[scrollSize]
}

// 放開滑鼠 → 結束拖曳並還原所有暫存狀態
const onDocumentPointerup = () => {
  document.removeEventListener('pointermove', onDocumentPointermove)
  document.removeEventListener('pointerup', onDocumentPointerup)

  dragging.value = false

  currentOrientation = null
  scrollOffset = null
  mousePosition = 0

  // 還原文字選取行為（只有在我們確實改過時才還原）
  if (document.onselectstart !== originalOnSelectStart) {
    document.onselectstart = originalOnSelectStart
  }
}

// ── thumb 的位置與尺寸（會綁到 template 的 inline style）──
const thumbLeft = ref(0)
const thumbTop = ref(0)
const thumbHeight = ref(0)
const thumbWidth = ref(0)

// thumb 顯示長度與「理想長度」的比例，用來修正捲動時 thumb 的位置（見 onScroll）
let ratioY = 1
let ratioX = 1

// 產生 aria-valuenow 用的 computed（目前捲動百分比，0–100）。
// 注意：scrollTop / scrollLeft 本身不是響應式的，所以下面用 `void thumbX.value`
// 故意製造一個對 thumb 位置 ref 的依賴，讓捲動更新 thumb 時這個 computed 也跟著重算。
const valuenow = (getter: (viewport: HTMLElement) => number) => {
  return computed(() => {
    const viewport = viewportRef.value
    if (!viewport) return 0

    return Math.floor(getter(viewport) * 100)
  })
}

const valuenowY = valuenow(({ scrollTop, scrollHeight, offsetHeight }) => {
  void thumbTop.value // thumbTop 變動時重算

  return scrollHeight - offsetHeight ? scrollTop / (scrollHeight - offsetHeight) : 100
})

const valuenowX = valuenow(({ scrollLeft, scrollWidth, offsetWidth }) => {
  void thumbLeft.value // thumbLeft 變動時重算

  return scrollWidth - offsetWidth ? scrollLeft / (scrollWidth - offsetWidth) : 100
})

// 容器捲動時：更新 thumb 位置，並讓捲軸顯示出來（接著排定自動隱藏）
const onScroll = () => {
  if (props.native) return

  const viewport = viewportRef.value
  if (!viewport) return

  const offsetHeight = viewport.offsetHeight - GAP
  const offsetWidth = viewport.offsetWidth - GAP

  // 捲動百分比 × ratio 修正，得到 thumb 在軌道上的位移（translate 百分比）
  thumbTop.value = ((viewport.scrollTop * 100) / offsetHeight) * ratioY
  thumbLeft.value = ((viewport.scrollLeft * 100) / offsetWidth) * ratioX

  scheduleHideScrollbar()
  active.value = true
}

// 容器或內容尺寸改變時：重算 thumb 的長度與位置修正比例。
// originalHeight 是「理想 thumb 長度」(可視長度² / 內容長度)，再以 MIN_SIZE 設下限；
// 若算出來幾乎跟可視範圍一樣長（代表內容沒有溢出）就把 thumb 設為 0（不顯示捲軸）。
const update = () => {
  const viewport = viewportRef.value
  if (!viewport) return

  // 扣掉 GAP 後的「有效可視尺寸」,跟 onScroll / 拖曳用的是同一個基準
  const offsetHeight = viewport.offsetHeight - GAP
  const offsetWidth = viewport.offsetWidth - GAP

  // 算「理論上」的 thumb 長度
  const originalHeight = offsetHeight ** 2 / viewport.scrollHeight
  const originalWidth = offsetWidth ** 2 / viewport.scrollWidth

  // 套用最小長度:內容超級長時 thumb 會被算得很短(難以點中),用 MIN_SIZE 設下限
  const height = Math.max(originalHeight, MIN_SIZE)
  const width = Math.max(originalWidth, MIN_SIZE)

  // 內容沒溢出（thumb 幾乎滿格）就隱藏；否則採用計算出的長度
  thumbHeight.value = height + GAP < offsetHeight ? height : 0
  thumbWidth.value = width + GAP < offsetWidth ? width : 0

  // 因為 thumb 被 MIN_SIZE 撐長後，捲動位移需要等比例縮放才不會超出軌道
  ratioY =
    originalHeight / (offsetHeight - originalHeight) / (height / (offsetHeight - height))
  ratioX =
    originalWidth / (offsetWidth - originalWidth) / (width / (offsetWidth - width))
}

// viewport 尺寸變化(視窗縮放、容器 resize)→ 重算 thumb 長度
useResizeObserver(viewportRef, update)
// 元件重新渲染（內容增減）後也重算一次
onUpdated(update)
// SSR hydration 後，ResizeObserver 的首次回呼可能在 viewport 還沒套到版面尺寸前就觸發，
// 因此在下一個 frame 再量一次，確保靜態頁面上的 thumb 尺寸也正確。
onMounted(() => nextTick(update))

// ── 卸載清理(防止拖曳途中被卸載造成的洩漏)──
onBeforeUnmount(() => {
  time && clearTimeout(time)
  onDocumentPointerup()
})
</script>

<template>
  <div
    class="base-scrollbar"
    :class="{ 'base-scrollbar--native': native }"
  >
    <!-- 真正會捲動的容器；id 供 track 的 aria-controls 指向 -->
    <div
      :id="id"
      ref="viewportRef"
      class="base-scrollbar__viewport"
      @scroll="onScroll"
    >
      <slot name="default" />
    </div>
    <!-- native 模式不渲染自訂 track，直接用瀏覽器原生捲軸 -->
    <template v-if="!native">
      <!-- 垂直捲軸：thumbHeight 為 0（內容未溢出）時整段不渲染 -->
      <Transition
        v-if="thumbHeight"
        name="base-scrollbar"
      >
        <div
          v-show="active || dragging"
          :aria-controls="id"
          aria-orientation="vertical"
          aria-valuemax="100"
          aria-valuemin="0"
          :aria-valuenow="valuenowY"
          class="base-scrollbar__track base-scrollbar__track--vertical"
          role="scrollbar"
          @pointerdown="onTrackPointerdown($event, 'vertical')"
          @pointerenter="onTrackPointerenter"
          @pointerleave="onTrackPointerleave"
        >
          <div
            class="base-scrollbar__thumb"
            :style="{ transform: `translateY(${thumbTop}%)`, height: `${thumbHeight}px` }"
            @pointerdown="onThumbPointerdown($event, 'vertical')"
          />
        </div>
      </Transition>
      <!-- 水平捲軸：邏輯與垂直相同，只是換成 X 軸 -->
      <Transition
        v-if="thumbWidth"
        name="base-scrollbar"
      >
        <div
          v-show="active || dragging"
          :aria-controls="id"
          aria-orientation="horizontal"
          aria-valuemax="100"
          aria-valuemin="0"
          :aria-valuenow="valuenowX"
          class="base-scrollbar__track base-scrollbar__track--horizontal"
          role="scrollbar"
          @pointerdown="onTrackPointerdown($event, 'horizontal')"
          @pointerenter="onTrackPointerenter"
          @pointerleave="onTrackPointerleave"
        >
          <div
            class="base-scrollbar__thumb"
            :style="{ transform: `translateX(${thumbLeft}%)`, width: `${thumbWidth}px` }"
            @pointerdown="onThumbPointerdown($event, 'horizontal')"
          />
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped lang="scss">
.base-scrollbar {
  position: relative;
  overflow: hidden; // 由根節點負責裁切，原生捲軸藏在 viewport 內

  &__viewport {
    overflow: auto;
    height: inherit;
    // 讓使用者可在根節點用 height 或 max-height 來限制捲動區高度，viewport 兩者都繼承。
    max-height: inherit;
  }

  // 非 native 模式：隱藏原生捲軸（Firefox + WebKit 各一招）
  &:not(#{&}--native) &__viewport {
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__track {
    --base-scrollbar-track-size: 8px; // 軌道粗細（hover 時變粗）

    position: absolute;
    background-color: transparent;
    border-radius: 10px;

    &--vertical,
    &--horizontal {
      right: 2px;
      bottom: 2px;
      // 只動畫會變化的屬性（粗細 + 背景），避免 `all` 連帶動畫到非預期屬性
      transition-property: width, height, background-color;
      transition-duration: 300ms;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }

    &--vertical {
      top: 2px;
      width: var(--base-scrollbar-track-size);
    }

    &--horizontal {
      left: 2px;
      height: var(--base-scrollbar-track-size);
    }

    &:hover {
      --base-scrollbar-track-size: 10px;

      background-color: var(--color-surface-alt);
    }
  }

  &__thumb {
    background-color: var(--color-text-muted); // 跟著主題的次要文字色，深淺主題皆適用
    border-radius: 10px;
    opacity: 0.5;
    // 避免觸控裝置把「拖曳 thumb」誤判成捲動手勢而中斷
    touch-action: none;
    transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      opacity: 0.7;
    }
  }

  // thumb 在非主軸方向填滿軌道寬 / 高
  &__track--vertical &__thumb {
    width: 100%;
  }

  &__track--horizontal &__thumb {
    height: 100%;
  }
}

// 捲軸顯示 / 隱藏的淡入淡出（搭配 template 的 <Transition name="base-scrollbar">）
.base-scrollbar-enter-active {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.base-scrollbar-leave-active {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0.2, 0, 1);
  transition-duration: 350ms;
}

.base-scrollbar-enter-from,
.base-scrollbar-leave-active {
  opacity: 0;
}
</style>
