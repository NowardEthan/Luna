import { useMemo } from 'react'
import { useLunaAuth } from '../features/auth/AuthProvider'
import type { LlmProviderId } from '../lib/llmModelSelection'

export function useLunarEntitlements() {
  const auth = useLunaAuth()

  return useMemo(() => {
    const connected = auth.isLunarConnected

    return {
      connected,
      canUseHostedLlm: connected && auth.entitlements.hostedLlm,
      canUseCloudRagEmbed: connected && auth.entitlements.sync,
      canUseWebSearch: connected && auth.entitlements.webSearch,
      canUseMarketplaceRemote: connected && auth.entitlements.marketplaceRemote,
      canSyncData: connected && auth.entitlements.sync,
      canUseIdeLocal: true,
      canUseMcpLocal: true,
      canUseOllama: true,
    }
  }, [auth])
}

export function providerRequiresLunarAccount(
  provider: LlmProviderId | string | undefined,
): boolean {
  return provider !== 'ollama' && Boolean(provider)
}

export function canUseProviderWithEntitlements(
  provider: LlmProviderId | string | undefined,
  entitlements: ReturnType<typeof useLunarEntitlements>,
): boolean {
  if (!provider || provider === 'ollama') return entitlements.canUseOllama
  return entitlements.canUseHostedLlm
}
