import { describe, expect, it } from 'vitest'
import { filterAddons, type AddonListItem } from './addonFilters'

function item(
  id: string,
  name: string,
  enabled: boolean,
  description?: string,
): AddonListItem {
  return {
    manifest: {
      id,
      name,
      version: '1.0.0',
      description,
    },
    enabled,
    origin: 'project',
  }
}

describe('filterAddons', () => {
  const list = [
    item('a', 'Alpha Plugin', true, 'first'),
    item('b', 'Beta Tool', false, 'second'),
  ]

  it('filters by enabled only', () => {
    expect(filterAddons(list, '', true)).toHaveLength(1)
    expect(filterAddons(list, '', true)[0]?.manifest.id).toBe('a')
  })

  it('filters by search query', () => {
    expect(filterAddons(list, 'beta', false)).toHaveLength(1)
    expect(filterAddons(list, 'beta', false)[0]?.manifest.id).toBe('b')
  })
})
