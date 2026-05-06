// Convert between "BTC/TWD" (display) and "BTC-TWD" (URL slug)
// because slash in URLs gets treated as path separator.

export function symbolToSlug(symbol: string): string {
  return symbol.replace('/', '-')
}

export function symbolFromSlug(slug: string): string {
  return slug.replace('-', '/')
}
