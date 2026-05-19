import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { isLunarCloudSession } from '../../lib/lunarGate'

const RISK_ACK_KEY = 'luna-plugins-risk-ack'

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

  useEffect(() => {
    if (!isLunarCloudSession()) return
    const url = readLunaCloudConfig().marketplaceCatalogUrl
    if (!url) return

    let cancelled = false
    setCatalogLoading(true)
    void fetchRemoteMarketplaceCatalog(url, { quiet: import.meta.env.DEV }).then(
      (remote) => {
      if (cancelled) return
      setCatalogLoading(false)
        if (remote && remote.items.length > 0) {
          setCatalog(remote.items)
          setCatalogSource('remote')
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MarketplaceCategoryId | 'all'>('all')
  const [riskAck, setRiskAck] = useState(readRiskAcknowledged)
  const [busy, setBusy] = useState(false)
  const [statusHint, setStatusHint] = useState<string | null>(null)
  const [installedRevision, setInstalledRevision] = useState(0)

  const canInstallDesktop = Boolean(window.plugins?.installBundled)
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
    if (!window.plugins?.pickAndInstall) {
      setStatusHint('Instalação local só está disponível na app desktop.')
      return
    }
    setBusy(true)
    setStatusHint(null)
    try {
      const picked = await window.plugins.pickAndInstall()
      if (!picked.ok) {
        if ('canceled' in picked && picked.canceled) return
        setStatusHint('error' in picked ? picked.error : 'Instalação cancelada.')
        return
      }
      const applied = await applyPluginInstallResult(picked, {
        enable: riskAck,
        riskAck,
      })
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
        err instanceof Error ? err.message : 'Não foi possível instalar o add-on.',
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
          if (!window.plugins?.pickAndInstall) {
            setStatusHint('Instalação local só está disponível na app desktop.')
            return
          }
          const picked = await window.plugins.pickAndInstall()
          if (!picked.ok) {
            if ('canceled' in picked && picked.canceled) return
            setStatusHint(
              'error' in picked ? picked.error : 'Instalação cancelada.',
            )
            return
          }
          const applied = await applyPluginInstallResult(picked, {
            enable: riskAck,
            riskAck,
          })
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
          setStatusHint('Instalação por URL em breve.')
          if (item.install.url) {
            window.open(item.install.url, '_blank', 'noopener,noreferrer')
          }
          return
        }

        if (!window.plugins?.installBundled) {
          setStatusHint('A loja requer a aplicação desktop Luna.')
          return
        }
        if (!item.pluginId) {
          setStatusHint('Este item não tem ID de plugin.')
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
              ? `«${applied.manifest.name}» instalado e activado.`
              : `«${applied.manifest.name}» instalado.`,
          )
          bumpInstalled()
        }
      } catch (err) {
        setStatusHint(
          err instanceof Error
            ? err.message
            : 'Não foi possível instalar o add-on.',
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
  }
}
