import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { extractSymbols, type ForgeSymbol } from '../../../lib/forgeSymbols'

const KIND_ICONS: Record<ForgeSymbol['kind'], string> = {
  function: 'ƒ',
  method: 'm',
  class: 'C',
  interface: 'I',
  type: 'T',
  const: 'k',
}

export function ForgeOutlinePanel() {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const forge = useForgeLayout()
  const [symbols, setSymbols] = useState<ForgeSymbol[]>([])

  const activePath = ws.activeFilePath
  const active = ws.openFiles.find((f) => f.path === activePath)

  useEffect(() => {
    if (!activePath || !active) {
      setSymbols([])
      return
    }

    const refresh = () => {
      const content = ws.getTabContent(activePath) ?? active.content
      setSymbols(extractSymbols(content))
    }

    refresh()
    if (!active.dirty) return

    const id = window.setInterval(refresh, 500)
    return () => window.clearInterval(id)
  }, [
    activePath,
    active?.dirty,
    active?.content,
    ws.externalContentRevision,
    ws.getTabContent,
    active,
  ])

  const goTo = (sym: ForgeSymbol) => {
    if (!active) return
    forge.setRevealLine({ path: active.path, line: sym.line })
  }

  if (!active) {
    return (
      <p className="px-3 py-4 text-[11px] text-fg-muted">{t('forge.outline.noFile')}</p>
    )
  }

  if (symbols.length === 0) {
    return (
      <p className="px-3 py-4 text-[11px] text-fg-muted">{t('forge.outline.empty')}</p>
    )
  }

  return (
    <ul className="py-1">
      {symbols.map((sym) => (
        <li key={`${sym.kind}-${sym.name}-${sym.line}`}>
          <button
            type="button"
            onClick={() => goTo(sym)}
            className="luna-hover-row flex w-full items-center gap-2 px-3 py-1 text-left text-[11px]"
          >
            <span className="w-4 shrink-0 font-mono text-[10px] text-accent">
              {KIND_ICONS[sym.kind]}
            </span>
            <span className="min-w-0 truncate text-fg">{sym.name}</span>
            <span className="ml-auto text-[9px] text-fg-muted">:{sym.line}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
