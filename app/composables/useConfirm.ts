// Promise-based custom confirm dialog — replaces window.confirm() across the app.
// Single global host (BaseConfirmHost in app.vue) renders the active prompt.
//
// Pattern:
//   const { confirm } = useConfirm()
//   if (!await confirm({ message: '…', variant: 'danger' })) return
//
// Notes
// - Resolver functions are non-serializable, so they live in a module-scope Map
//   keyed by id; only display state lives in useState.
// - If a second confirm() is called while one is already pending, the previous
//   one auto-resolves to false (cancel), preventing stacked dialogs.

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'danger'
}

export interface PendingConfirm extends ConfirmOptions {
  id: number
}

const resolvers = new Map<number, (value: boolean) => void>()
let counter = 0

export function useConfirm() {
  const pending = useState<PendingConfirm | null>('app:confirm:pending', () => null)

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      // Auto-cancel any in-flight prompt so dialogs never stack.
      if (pending.value) {
        const prev = pending.value
        const prevResolve = resolvers.get(prev.id)
        resolvers.delete(prev.id)
        pending.value = null
        prevResolve?.(false)
      }
      const id = ++counter
      resolvers.set(id, resolve)
      pending.value = { ...opts, id }
    })
  }

  function settle(value: boolean) {
    const cur = pending.value
    if (!cur) return
    const r = resolvers.get(cur.id)
    resolvers.delete(cur.id)
    pending.value = null
    r?.(value)
  }

  return { confirm, pending, settle }
}
