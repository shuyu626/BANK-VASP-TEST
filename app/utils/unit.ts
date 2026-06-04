// 尺寸 / CSS 長度相關的純函式 helper。
// 供 BaseAvatar 等需要「同時接受數字與 'full' / 具名尺寸」的元件解析 props。
// 純函式、無副作用、無 Vue API，對應測試在 tests/utils/unit.test.ts。

/**
 * 判斷值是否為「數字、或可被解析為數字的字串」。
 *
 * 用途：元件的 size / rounded prop 允許 `40`、`'40'`（數字）與
 * `'medium'`、`'full'`（語意關鍵字）混用，需先區分兩者再走不同分支。
 *
 * @example
 * isNumberish(40)      // true
 * isNumberish('40')    // true
 * isNumberish('medium')// false
 * isNumberish('')      // false（空字串不算數字）
 * isNumberish(NaN)     // false
 */
export function isNumberish(value: unknown): value is number | `${number}` {
  if (typeof value === 'number') return !Number.isNaN(value)
  if (typeof value === 'string') return value.trim() !== '' && !Number.isNaN(Number(value))
  return false
}

/**
 * 將數字 / 數字字串轉成帶單位的 CSS 長度字串；非數字值原樣回傳。
 *
 * @param value 數字（`8`）、數字字串（`'8'`）或已含單位的字串（`'8px'`）
 * @param unit  數字情況下要補的單位，預設 `px`
 *
 * @example
 * toUnit(8)      // '8px'
 * toUnit('8')    // '8px'
 * toUnit('8px')  // '8px'（已含單位 → 原樣回傳）
 * toUnit(1, 'rem') // '1rem'
 */
export function toUnit(value: number | string, unit = 'px'): string {
  return isNumberish(value) ? `${value}${unit}` : String(value)
}
