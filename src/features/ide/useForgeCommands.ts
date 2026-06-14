import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { commandRegistry } from '../../core/registry/CommandRegistry'
import { useForgeLayout } from '../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import { openForgeInlineEdit } from '../../lib/forgeInlineEditStore'

const PREFIX = 'forge:'

export function useForgeCommands(enabled: boolean) {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const forgeRef = useRef(forge)
  forgeRef.current = forge
  const wsRef = useRef(ws)
  wsRef.current = ws

  useEffect(() => {
    if (!enabled) return

    const f = () => forgeRef.current
    const w = () => wsRef.current

    const cmds = [
      {
        id: `${PREFIX}quick-open`,
        label: t('forge.commands.quickOpen'),
        keywords: 'ficheiro file goto open ctrl p',
        run: () => f().setQuickOpen(true),
      },
      {
        id: `${PREFIX}search`,
        label: t('forge.commands.search'),
        keywords: 'pesquisar find grep ctrl shift f',
        run: () => f().setActiveView('search'),
      },
      {
        id: `${PREFIX}explorer`,
        label: t('forge.commands.explorer'),
        keywords: 'ficheiros files ctrl shift e',
        run: () => f().setActiveView('explorer'),
      },
      {
        id: `${PREFIX}git`,
        label: t('forge.commands.git'),
        keywords: 'source control commit ctrl shift g',
        run: () => f().setActiveView('git'),
      },
      {
        id: `${PREFIX}outline`,
        label: t('forge.commands.outline'),
        keywords: 'símbolos symbols',
        run: () => f().setActiveView('outline'),
      },
      {
        id: `${PREFIX}terminal`,
        label: t('forge.commands.terminal'),
        keywords: 'painel ctrl backtick',
        run: () => f().setBottomTab('terminal'),
      },
      {
        id: `${PREFIX}toggle-sidebar`,
        label: t('forge.commands.toggleSidebar'),
        keywords: 'barra lateral ctrl b',
        run: () => f().setSidebarOpen(!f().sidebarOpen),
      },
      {
        id: `${PREFIX}toggle-ai`,
        label: t('forge.commands.toggleAi'),
        keywords: 'luna chat painel ctrl j',
        run: () => f().toggleAiPanel(),
      },
      {
        id: `${PREFIX}save`,
        label: t('forge.commands.save'),
        keywords: 'guardar gravar ctrl s',
        run: () => void w().saveActiveFile(),
      },
      {
        id: `${PREFIX}save-all`,
        label: t('forge.commands.saveAll'),
        keywords: 'guardar todos ctrl shift s',
        run: () => void w().saveAllDirtyFiles(),
      },
      {
        id: `${PREFIX}format`,
        label: t('forge.commands.format'),
        keywords: 'formatar prettier shift alt f',
        run: () => void w().formatActiveFile(),
      },
      {
        id: `${PREFIX}split-editor`,
        label: t('forge.commands.splitEditor'),
        keywords: 'dividir split editor',
        run: () => {
          const layout = f()
          const wk = w()
          if (layout.editorSplit) {
            layout.setEditorSplit(false)
            layout.setFocusPane('primary')
          } else {
            layout.setSplitFilePath(wk.activeFilePath)
            layout.setEditorSplit(true)
            layout.setFocusPane('primary')
          }
        },
      },
      {
        id: `${PREFIX}toggle-minimap`,
        label: t('forge.commands.toggleMinimap'),
        keywords: 'minimap mapa',
        run: () => f().toggleEditorMinimap(),
      },
      {
        id: `${PREFIX}inline-edit`,
        label: t('forge.commands.inlineEdit'),
        keywords: 'editar ia inline ctrl k',
        run: () => {
          const wk = w()
          const path = wk.activeFilePath
          if (!path) return
          const content = wk.getTabContent(path) ?? ''
          openForgeInlineEdit({
            path,
            content,
            selectedText: '',
            selectionFrom: 0,
            selectionTo: 0,
            pane: f().focusPane,
          })
        },
      },
    ]

    for (const cmd of cmds) {
      commandRegistry.register(cmd)
    }
    window.dispatchEvent(new CustomEvent('luna-forge-commands'))

    return () => {
      for (const cmd of cmds) {
        commandRegistry.unregister(cmd.id)
      }
      window.dispatchEvent(new CustomEvent('luna-forge-commands'))
    }
  }, [enabled, t])
}
