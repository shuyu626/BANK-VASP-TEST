// 確保 i18n/locales/zh-TW.json 與 en.json 的 key 結構完全一致。
// 任一語系新增 key 但忘記補另一邊時這個測試就會失敗，避免使用者在某個語系看到 raw key。
import { describe, it, expect } from 'vitest'
import zhTW from '../i18n/locales/zh-TW.json'
import en from '../i18n/locales/en.json'

type Json = string | number | boolean | { [k: string]: Json } | Json[]

/** 收集物件所有 leaf key（dot path），排除 array index — 翻譯 JSON 不應出現陣列。 */
function collectLeafKeys(obj: Json, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  if (Array.isArray(obj)) {
    throw new Error(`Unexpected array at "${prefix}"; i18n JSON should not contain arrays`)
  }
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    out.push(...collectLeafKeys(v as Json, next))
  }
  return out
}

describe('i18n locale sync', () => {
  const zhKeys = new Set(collectLeafKeys(zhTW as Json))
  const enKeys = new Set(collectLeafKeys(en as Json))

  it('zh-TW and en have identical key sets', () => {
    const onlyInZh = [...zhKeys].filter(k => !enKeys.has(k)).sort()
    const onlyInEn = [...enKeys].filter(k => !zhKeys.has(k)).sort()
    expect(onlyInZh, `Missing in en.json:\n  ${onlyInZh.join('\n  ')}`).toEqual([])
    expect(onlyInEn, `Missing in zh-TW.json:\n  ${onlyInEn.join('\n  ')}`).toEqual([])
  })

  it('zh-TW has no empty translation', () => {
    const empties: string[] = []
    function walk(obj: Json, prefix = '') {
      if (obj === null || typeof obj !== 'object') return
      if (Array.isArray(obj)) return
      for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'string') {
          // tier0 unlocks 留空字串是業務語意（沒解鎖任何功能），允許
          if (v === '' && next !== 'kycTier.tier0.unlocks') empties.push(next)
        } else {
          walk(v as Json, next)
        }
      }
    }
    walk(zhTW as Json)
    expect(empties, `Empty zh-TW values:\n  ${empties.join('\n  ')}`).toEqual([])
  })

  it('en has no empty translation', () => {
    const empties: string[] = []
    function walk(obj: Json, prefix = '') {
      if (obj === null || typeof obj !== 'object') return
      if (Array.isArray(obj)) return
      for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'string') {
          if (v === '' && next !== 'kycTier.tier0.unlocks') empties.push(next)
        } else {
          walk(v as Json, next)
        }
      }
    }
    walk(en as Json)
    expect(empties, `Empty en values:\n  ${empties.join('\n  ')}`).toEqual([])
  })
})
