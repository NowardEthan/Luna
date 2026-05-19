import { describe, expect, it } from 'vitest'
import {
  filterMarketplaceListings,
  marketplaceListings,
} from './marketplaceCatalog'

describe('marketplaceCatalog', () => {
  it('starts with an empty catalog', () => {
    expect(marketplaceListings()).toEqual([])
  })

  it('filters empty list', () => {
    expect(filterMarketplaceListings([], 'test', 'all', false)).toEqual([])
  })
})
