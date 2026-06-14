import { describe, expect, it } from 'vitest'
import { buildQuotaSnapshot, checkStateFitsQuota, getCloudQuotaLimitBytes } from './lunarCloudQuota'

describe('lunarCloudQuota', () => {
  it('free plan limit is 25 MB', () => {
    expect(getCloudQuotaLimitBytes('free')).toBe(25 * 1024 * 1024)
  })

  it('rejects when estimate exceeds limit', () => {
    const limit = getCloudQuotaLimitBytes('free')
    const check = checkStateFitsQuota('free', { conversations: [], folders: [] }, 'x'.repeat(limit + 1))
    expect(check.ok).toBe(false)
    expect(check.snapshot.atLimit).toBe(true)
  })

  it('builds available bytes', () => {
    const snap = buildQuotaSnapshot('free', 1024)
    expect(snap.availableBytes).toBe(snap.limitBytes - 1024)
    expect(snap.percentUsed).toBeGreaterThanOrEqual(0)
  })
})
