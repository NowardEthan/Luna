import { describe, expect, it } from 'vitest'
import { requiresLunarAccountForProvider } from '../lib/lunarGate'
import { canUseProviderWithEntitlements } from './useLunarEntitlements'

describe('useLunarEntitlements helpers', () => {
  const offline = {
    offline: true,
    connected: false,
    canUseHostedLlm: false,
    canUseCloudRagEmbed: false,
    canUseWebSearch: false,
    canUseMarketplaceRemote: false,
    canSyncData: false,
    canUseIdeLocal: true,
    canUseMcpLocal: true,
    canUseOllama: true,
  }

  const connected = {
    ...offline,
    offline: false,
    connected: true,
    canUseHostedLlm: true,
    canUseCloudRagEmbed: true,
    canUseWebSearch: true,
    canUseMarketplaceRemote: true,
    canSyncData: true,
  }

  it('requiresLunarAccountForProvider', () => {
    expect(requiresLunarAccountForProvider('groq')).toBe(true)
    expect(requiresLunarAccountForProvider('ollama')).toBe(false)
  })

  it('canUseProviderWithEntitlements', () => {
    expect(canUseProviderWithEntitlements('ollama', offline)).toBe(true)
    expect(canUseProviderWithEntitlements('groq', offline)).toBe(false)
    expect(canUseProviderWithEntitlements('groq', connected)).toBe(true)
  })
})
