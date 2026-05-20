import { describe, expect, it } from 'vitest'
import { computePageItems, type PageItem } from '~~/app/utils/pagination'

const pages = (items: PageItem[]) =>
  items.map((i) => (i.type === 'ellipsis' ? '…' : i.page))

describe('computePageItems', () => {
  describe('small page counts (no ellipsis)', () => {
    it('renders a single page when count = 1', () => {
      expect(pages(computePageItems({ page: 1, count: 1 }))).toEqual([1])
    })

    it('renders all pages contiguously when count <= boundary + sibling * 2 + 3', () => {
      // count=7, boundary=1, sibling=1 → 1 + 2 + 3 + 2 + 1 = no ellipsis case
      expect(pages(computePageItems({ page: 4, count: 7 }))).toEqual([1, 2, 3, 4, 5, 6, 7])
    })
  })

  describe('symmetry: button count stays stable across page positions', () => {
    it('keeps the same item length whether page is at start, middle, or end', () => {
      const count = 10
      const lengths = [1, 5, 10].map(
        (page) => computePageItems({ page, count }).length,
      )
      expect(new Set(lengths).size).toBe(1)
    })

    it('keeps the same item length for a longer count', () => {
      const count = 50
      const lengths = [1, 10, 25, 40, 50].map(
        (page) => computePageItems({ page, count }).length,
      )
      expect(new Set(lengths).size).toBe(1)
    })
  })

  describe('ellipsis placement', () => {
    it('shows only end-ellipsis when page is near start', () => {
      // page=1, count=10, boundary=1, sibling=1 → [1, 2, 3, 4, 5, …, 10]
      expect(pages(computePageItems({ page: 1, count: 10 }))).toEqual([1, 2, 3, 4, 5, '…', 10])
    })

    it('shows both ellipses when page is in the middle', () => {
      // page=5, count=10 → [1, …, 4, 5, 6, …, 10]
      expect(pages(computePageItems({ page: 5, count: 10 }))).toEqual([1, '…', 4, 5, 6, '…', 10])
    })

    it('shows only start-ellipsis when page is near end', () => {
      // page=10, count=10 → [1, …, 6, 7, 8, 9, 10]
      expect(pages(computePageItems({ page: 10, count: 10 }))).toEqual([1, '…', 6, 7, 8, 9, 10])
    })

    it('replaces single-gap ellipsis with the actual page', () => {
      // When an ellipsis would only span one hidden page, render that page instead.
      // count=7, page=4 → gap between 5 and 7 is just page 6, so render it inline.
      expect(pages(computePageItems({ page: 4, count: 7 })))
        .toEqual([1, 2, 3, 4, 5, 6, 7])
    })
  })

  describe('boundaryCount / siblingCount overrides', () => {
    it('expands head and tail when boundaryCount = 2', () => {
      // page=10, count=20, boundary=2 → [1, 2, …, 9, 10, 11, …, 19, 20]
      expect(pages(computePageItems({ page: 10, count: 20, boundaryCount: 2 })))
        .toEqual([1, 2, '…', 9, 10, 11, '…', 19, 20])
    })

    it('shrinks the window when siblingCount = 0', () => {
      // page=10, count=20, sibling=0 → [1, …, 10, …, 20]
      expect(pages(computePageItems({ page: 10, count: 20, siblingCount: 0 })))
        .toEqual([1, '…', 10, '…', 20])
    })
  })

  describe('output shape', () => {
    it('returns a discriminated union of page / ellipsis items', () => {
      const items = computePageItems({ page: 5, count: 20 })
      for (const item of items) {
        if (item.type === 'page') {
          expect(typeof item.page).toBe('number')
          expect(item.page).toBeGreaterThanOrEqual(1)
          expect(item.page).toBeLessThanOrEqual(20)
        } else {
          expect(item.type).toBe('ellipsis')
        }
      }
    })

    it('never includes duplicate page numbers', () => {
      const items = computePageItems({ page: 5, count: 100 })
      const numbers = items.filter((i): i is { type: 'page'; page: number } => i.type === 'page').map((i) => i.page)
      expect(new Set(numbers).size).toBe(numbers.length)
    })

    it('produces monotonically increasing page numbers', () => {
      const items = computePageItems({ page: 7, count: 30 })
      const numbers = items.filter((i): i is { type: 'page'; page: number } => i.type === 'page').map((i) => i.page)
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]!)
      }
    })
  })
})
