<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '~/stores/notifications'

const { t } = useI18n()
const store = useNotificationsStore()
const { items, unreadCount } = storeToRefs(store)

const open = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFocusable(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null)
}

function focusInitial() {
  if (!panelRef.value) return
  const focusables = getFocusable()
  const target = focusables[0] ?? panelRef.value
  setTimeout(() => target.focus({ preventScroll: true }), 0)
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (e.key !== 'Tab') return
  // 只在 panel 已掛載且 focus 在 panel 內時做循環
  if (!panelRef.value?.contains(document.activeElement)) return
  const focusables = getFocusable()
  if (focusables.length === 0) {
    e.preventDefault()
    panelRef.value.focus({ preventScroll: true })
    return
  }
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first) {
      e.preventDefault()
      last.focus({ preventScroll: true })
    }
  } else {
    if (active === last) {
      e.preventDefault()
      first.focus({ preventScroll: true })
    }
  }
}

onMounted(() => {
  store.hydrate()
  document.addEventListener('mousedown', onOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onKeydown)
})

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nextTick(() => focusInitial())
  } else {
    previouslyFocused?.focus({ preventScroll: true })
    previouslyFocused = null
  }
})

function onOutside(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  if (panelRef.value?.contains(target)) return
  if (buttonRef.value?.contains(target)) return
  open.value = false
}

function toggle() {
  open.value = !open.value
}

function levelClass(level: string): string {
  return {
    info: 'border-l-info',
    success: 'border-l-success',
    warning: 'border-l-warning',
    danger: 'border-l-danger'
  }[level] ?? 'border-l-border'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('common.relativeTime.justNow')
  if (m < 60) return t('common.relativeTime.minutesAgo', { count: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('common.relativeTime.hoursAgo', { count: h })
  const d = Math.floor(h / 24)
  return t('common.relativeTime.daysAgo', { count: d })
}

const { confirm } = useConfirm()

async function onClear() {
  const ok = await confirm({
    message: t('trader.notifications.clearConfirm'),
    variant: 'danger'
  })
  if (!ok) return
  store.clear()
}
</script>

<template>
  <div class="relative">
    <button
      ref="buttonRef"
      type="button"
      class="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-surface-alt transition"
      :aria-label="$t('trader.notifications.bellAria')"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <Icon name="lucide:bell" size="18" aria-hidden="true" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold leading-none"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        ref="panelRef"
        class="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] bg-surface border border-border rounded-md shadow-lg overflow-hidden z-30 flex flex-col outline-none"
        role="dialog"
        aria-modal="false"
        :aria-label="$t('trader.notifications.panelTitle')"
        tabindex="-1"
      >
        <header class="px-4 py-3 border-b border-border flex items-center justify-between">
          <div class="text-sm font-semibold">{{ $t('trader.notifications.panelTitle') }}</div>
          <div class="flex gap-1">
            <button
              v-if="unreadCount > 0"
              type="button"
              class="text-xs text-text-muted hover:text-text px-2 py-1"
              @click="store.markAllRead()"
            >
              {{ $t('trader.notifications.markAllRead') }}
            </button>
            <button
              v-if="items.length > 0"
              type="button"
              class="text-xs text-text-muted hover:text-danger px-2 py-1"
              @click="onClear"
            >
              {{ $t('trader.notifications.clear') }}
            </button>
          </div>
        </header>

        <div class="overflow-y-auto flex-1">
          <div v-if="items.length === 0" class="text-center text-sm text-text-muted py-10">
            {{ $t('trader.notifications.empty') }}
          </div>
          <ul v-else class="divide-y divide-border" role="list">
            <li v-for="n in items" :key="n.id">
              <button
                type="button"
                class="w-full text-left px-4 py-3 border-l-4 hover:bg-surface-alt transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                :class="[levelClass(n.level), n.read ? 'opacity-70' : '']"
                @click="store.markRead(n.id)"
              >
                <div class="flex items-start gap-2">
                  <span v-if="!n.read" class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" aria-hidden="true" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm" :class="n.read ? 'text-text-muted' : 'text-text font-medium'">
                      {{ $t(n.titleKey) }}
                    </div>
                    <div v-if="n.body" class="text-xs text-text-muted mt-0.5 break-all">{{ n.body }}</div>
                    <div class="text-[10px] text-text-muted mt-1 num">{{ timeAgo(n.createdAt) }}</div>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>
