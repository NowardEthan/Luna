import { useEffect, type ReactNode } from 'react'

import { AuthProvider } from '../features/auth/AuthProvider'
import { installLunarAccountListeners } from '../features/auth/lunarAccountListeners'
import { LunaWorkspaceProvider } from '../features/ide/context'

import { registerBuiltinTools } from '../core/tools/registerBuiltin'

import { pluginHost } from '../core/plugin/PluginHost'

import { registerBuiltinPlugins } from '../plugins/builtin'

import { mcpToolProvider } from '../core/mcp/McpToolProvider'

import { registerBuiltinUi } from './registerBuiltinUi'

/** Síncrono antes do primeiro render — evita ToolRegistry vazio na UI inicial. */
registerBuiltinTools()
registerBuiltinPlugins()
registerBuiltinUi()

type Props = {
  children: ReactNode
}

export function AppProviders({ children }: Props) {
  useEffect(() => {
    void pluginHost.discover().then(() => mcpToolProvider.connect())
    const uninstallLunar = installLunarAccountListeners()

    return () => {
      mcpToolProvider.disconnect()
      uninstallLunar()
    }
  }, [])



  return (
    <AuthProvider>
      <LunaWorkspaceProvider>{children}</LunaWorkspaceProvider>
    </AuthProvider>
  )

}

