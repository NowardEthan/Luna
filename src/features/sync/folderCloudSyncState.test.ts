import { describe, expect, it } from 'vitest'
import { resolveFolderCloudSyncStateFromSubtree } from './folderCloudSyncState'

describe('resolveFolderCloudSyncStateFromSubtree', () => {
  it('mostra sincronizado quando todas as conversas filhas estão sincronizadas', () => {
    expect(
      resolveFolderCloudSyncStateFromSubtree(
        { enabled: true },
        null,
        false,
        ['synced', 'synced'],
      ),
    ).toBe('synced')
  })

  it('fica pendente sem lastSyncedAt quando não há conversas na nuvem', () => {
    expect(
      resolveFolderCloudSyncStateFromSubtree(
        { enabled: true },
        null,
        false,
        [],
      ),
    ).toBe('pending')
  })

  it('fica pendente se alguma conversa filha estiver pendente', () => {
    expect(
      resolveFolderCloudSyncStateFromSubtree(
        { enabled: true, lastSyncedAt: Date.now() },
        null,
        false,
        ['synced', 'pending'],
      ),
    ).toBe('pending')
  })

  it('prioriza runtime de sincronização', () => {
    expect(
      resolveFolderCloudSyncStateFromSubtree(
        { enabled: true, lastSyncedAt: 1 },
        'syncing',
        false,
        ['synced'],
      ),
    ).toBe('syncing')
  })
})
