import { describe, expect, it } from 'vitest'
import { computeLineDiff, countDiffChanges } from './lineDiff'

describe('lineDiff', () => {
  it('detects added and removed lines', () => {
    const lines = computeLineDiff('a\nb', 'a\nc')
    const stats = countDiffChanges(lines)
    expect(stats.removed).toBe(1)
    expect(stats.added).toBe(1)
  })
})
