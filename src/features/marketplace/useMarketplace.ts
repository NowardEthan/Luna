import { useCallback, useEffect, useMemo, useState } from 'react'
import i18n from '../../i18n'
import { eventBus } from '../../core/events/EventBus'
import {
  applyPluginInstallResult,
  isPluginInstalled,
} from '../../lib/installLunaPlugin'
import {
  filterMarketplaceListings,
  marketplaceCategories,
  marketplaceListings,
  type MarketplaceCategoryId,
  type MarketplaceListing,
} from '../../lib/marketplaceCatalog'
import { fetchRemoteMarketplaceCatalog } from '../../lib/marketplaceRemote'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { canPickPluginFromDisk, pickAndInstallPlugin } from '../../lib/pluginInstallClient'

const RISK_ACK_KEY = 'luna-plugins-risk-ack'
export const MARKETPLACE_CATALOG_URL_OVERRIDE_KEY = 'luna-marketplace-catalog-url'

function resolveMarketplaceCatalogUrl(): string | null {
  try {
    const override = localStorage.getItem(MARKETPLACE_CATALOG_URL_OVERRIDE_KEY)?.trim()
    if (override) return override
  } catch {
    /* ignore */
  }
  return readLunaCloudConfig().marketplaceCatalogUrl
}

function readRiskAcknowledged(): boolean {
  try {
    return localStorage.getItem(RISK_ACK_KEY) === '1'
  } catch {
    return false
  }
}

function writeRiskAcknowledged(): void {
  try {
    localStorage.setItem(RISK_ACK_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function useMarketplace() {
  const [catalog, setCatalog] = useState<MarketplaceListing[]>(() =>
    marketplaceListings(),
  )
  const [catalogSource, setCatalogSource] = useState<'local' | 'remote'>('local')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogHint, setCatalogHint] = useState<string | null>(null)

  const loadRemoteCatalog = useCallback((catalogUrl?: string) => {
    const url = catalogUrl?.trim() || resolveMarketplaceCatalogUrl()
    if (!url) {
      setCatalogHint(i18n.t('marketplace.hint.configureFirebase'))
      return Promise.resolve()
    }

    setCatalogLoading(true)
    setCatalogHint(null)
    return fetchRemoteMarketplaceCatalog(url, { quiet: import.meta.env.DEV }).then(
      (remote) => {
        setCatalogLoading(false)
        if (remote && remote.items.length > 0) {
          setCatalog(remote.items)
          setCatalogSource('remote')
          return
        }
        if (!remote) {
          setCatalogHint(i18n.t('marketplace.hint.loadFailed', { url }))
        } else if (remote.items.length === 0) {
          setCatalogHint(i18n.t('marketplace.hint.emptyRemote'))
        }
      },
    )
  }, [])

  useEffect(() => {
    void loadRemoteCatalog()
  }, [loadRemoteCatalog])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MarketplaceCategoryId | 'all'>('all')
  const [riskAck, setRiskAck] = useState(readRiskAcknowledged)
  const [busy, setBusy] = useState(false)
  const [statusHint, setStatusHint] = useState<string | null>(null)
  const [installedRevision, setInstalledRevision] = useState(0)

  const canInstallDesktop = Boolean(
    window.plugins?.installFromUrl || window.plugins?.installBundled,
  )
  const categories = useMemo(() => marketplaceCategories(catalog), [catalog])

  const filtered = useMemo(
    () => filterMarketplaceListings(catalog, query, category, false),
    [catalog, query, category],
  )

  const selected = useMemo(
    () => catalog.find((i) => i.id === selectedId) ?? null,
    [catalog, selectedId],
  )

  const bumpInstalled = useCallback(() => {
    setInstalledRevision((r) => r + 1)
  }, [])

  useEffect(() => {
    const unsubs = [
      eventBus.on('plugin:installed', bumpInstalled),
      eventBus.on('plugin:discover:complete', bumpInstalled),
      eventBus.on('plugin:activated', bumpInstalled),
      eventBus.on('plugin:deactivated', bumpInstalled),
      eventBus.on('plugin:enabled-changed', bumpInstalled),
    ]
    return () => unsubs.forEach((u) => u())
  }, [bumpInstalled])

  const isInstalled = useCallback(
    (item: MarketplaceListing) => {
      void installedRevision
      if (item.install.type === 'disk') return false
      if (!item.pluginId) return false
      return isPluginInstalled(item.pluginId)
    },
    [installedRevision],
  )

  const acknowledgeRisk = useCallback(() => {
    writeRiskAcknowledged()
    setRiskAck(true)
  }, [])

  const installFromDisk = useCallback(async () => {
    if (!canPickPluginFromDisk()) {
      setStatusHint(i18n.t('marketplace.hint.desktopOnly'))
      return
    }
    setBusy(true)
    setStatusHint(null)
    try {
      const picked = await pickAndInstallPlugin()
      if (!picked.ok) {
        if ('canceled' in picked && picked.canceled) return
        setStatusHint(
          'error' in picked ? picked.error : i18n.t('marketplace.hint.installCancelled'),
        )
        return
      }
      const applied = await applyPluginInstallResult(
        { ...picked, needsReload: picked.needsReload ?? false },
        {
          enable: riskAck,
          riskAck,
        },
      )
      if (!applied.ok) {
        setStatusHint(applied.error)
        return
      }
      if (!applied.reloaded) {
        setStatusHint(`«${applied.manifest.name}» instalado.`)
        bumpInstalled()
      }
    } catch (err) {
      setStatusHint(
        err instanceof Error ? err.message : i18n.t('marketplace.hint.installFailed'),
      )
    } finally {
      setBusy(false)
    }
  }, [riskAck, bumpInstalled])

  const installListing = useCallback(
    async (item: MarketplaceListing) => {
      setBusy(true)
      setStatusHint(null)
      try {
        if (item.install.type === 'disk') {
          if (!canPickPluginFromDisk()) {
            setStatusHint(i18n.t('marketplace.hint.desktopOnly'))
            return
          }
          const picked = await pickAndInstallPlugin()
          if (!picked.ok) {
            if ('canceled' in picked && picked.canceled) return
            setStatusHint(
              'error' in picked
                ? picked.error
                : i18n.t('marketplace.hint.installCancelled'),
            )
            return
          }
          const applied = await applyPluginInstallResult(
            { ...picked, needsReload: picked.needsReload ?? false },
            {
              enable: riskAck,
              riskAck,
            },
          )
          if (!applied.ok) {
            setStatusHint(applied.error)
            return
          }
          if (!applied.reloaded) {
            setStatusHint(`«${applied.manifest.name}» instalado.`)
            bumpInstalled()
          }
          return
        }

        if (item.install.type === 'url') {
          const downloadUrl = item.install.url?.trim()
          if (!downloadUrl) {
            setStatusHint(i18n.t('marketplace.hint.noDownloadUrl'))
            return
          }
          if (!window.plugins?.installFromUrl) {
            setStatusHint(i18n.t('marketplace.hint.remoteNeedsDesktop'))
            return
          }
          const result = await window.plugins.installFromUrl(downloadUrl)
          if (!result.ok) {
            setStatusHint(result.error)
            return
          }
          const applied = await applyPluginInstallResult(result, {
            enable: riskAck,
            riskAck,
          })
          if (!applied.ok) {
            setStatusHint(applied.error)
            return
          }
          if (!applied.reloaded) {
            setStatusHint(
              riskAck
                ? `«${applied.manifest.name}» instalado e ativado.`
                : `«${applied.manifest.name}» instalado.`,
            )
            bumpInstalled()
          }
          return
        }

        if (!window.plugins?.installBundled) {
          setStatusHint(i18n.t('marketplace.hint.storeNeedsDesktop'))
          return
        }
        if (!item.pluginId) {
          setStatusHint(i18n.t('marketplace.hint.noPluginId'))
          return
        }

        const result = await window.plugins.installBundled(item.pluginId)
        if (!result.ok) {
          setStatusHint(result.error)
          return
        }
        const applied = await applyPluginInstallResult(result, {
          enable: riskAck,
          riskAck,
        })
        if (!applied.ok) {
          setStatusHint(applied.error)
          return
        }
        if (!applied.reloaded) {
          setStatusHint(
            riskAck
              ? `«${applied.manifest.name}» instalado e ativado.`
              : `«${applied.manifest.name}» instalado.`,
          )
          bumpInstalled()
        }
      } catch (err) {
        setStatusHint(
          err instanceof Error
            ? err.message
            : i18n.t('marketplace.hint.installFailed'),
        )
      } finally {
        setBusy(false)
      }
    },
    [riskAck, bumpInstalled],
  )

  return {
    catalog,
    catalogSource,
    catalogLoading,
    catalogHint,
    categories,
    filtered,
    selected,
    selectedId,
    setSelectedId,
    query,
    setQuery,
    category,
    setCategory,
    riskAck,
    acknowledgeRisk,
    busy,
    statusHint,
    canInstallDesktop,
    isInstalled,
    installListing,
    installFromDisk,
    clearStatus: () => setStatusHint(null),
    refreshCatalog: loadRemoteCatalog,
  }
}
