// SSR fetch helper：在 server 端把 incoming cookie 轉發給 server-side $fetch，
// 確保 SSR 階段能用 trader_sid / admin_sid 命中需登入的 API。Client 端回傳 undefined 即可。

export function ssrCookieHeaders(): Record<string, string> | undefined {
  return import.meta.server ? useRequestHeaders(['cookie']) : undefined
}
