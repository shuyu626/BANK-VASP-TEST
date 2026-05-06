// Module-level singleton state，使所有元件共享同一份 toast 佇列。
// 搭配 <BaseToastHost /> 使用（已在三個 layout 內掛載）。

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

const toasts = ref<Toast[]>([])
let counter = 0

export const TOAST_DEFAULT_DURATION_MS = 2500

export function useToast() {
  function show(message: string, type: ToastType = 'success', durationMs = TOAST_DEFAULT_DURATION_MS) {
    const id = `t${++counter}`
    toasts.value = [...toasts.value, { id, type, message }]
    if (durationMs > 0) {
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
      }, durationMs)
    }
    return id
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    show,
    success: (message: string, durationMs?: number) => show(message, 'success', durationMs),
    error: (message: string, durationMs?: number) => show(message, 'error', durationMs),
    info: (message: string, durationMs?: number) => show(message, 'info', durationMs),
    warning: (message: string, durationMs?: number) => show(message, 'warning', durationMs),
    dismiss,
    clear
  }
}
