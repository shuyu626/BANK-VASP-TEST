// 加密提幣地址冷卻倒數：新加入的地址簿條目經過一段時間才能使用，避免社交工程攻擊。
// 接收冷卻總長（毫秒），回傳查詢剩餘 / 判定是否冷卻完成的工具。
//
// 用法：
//   const { remainingMs, isCool } = useAddressCooldown(SETTLEMENT_DELAYS.newAddressCooldownMs)
//   isCool(entry.addedAt)            // boolean
//   remainingMs(entry.addedAt)       // number — 距冷卻結束剩餘毫秒

export function useAddressCooldown(cooldownMs: number) {
  const nowTick = ref(Date.now())
  let handle: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    handle = setInterval(() => { nowTick.value = Date.now() }, 500)
  })
  onBeforeUnmount(() => {
    if (handle) clearInterval(handle)
  })

  function remainingMs(addedAt: string): number {
    const age = nowTick.value - new Date(addedAt).getTime()
    return Math.max(0, cooldownMs - age)
  }
  function isCool(addedAt: string): boolean {
    return remainingMs(addedAt) === 0
  }

  return { nowTick, remainingMs, isCool }
}
