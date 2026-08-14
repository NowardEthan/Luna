import { describe, expect, it } from 'vitest'
import { requiresLunarAccountForProvider } from '../lib/lunarGate'
import { canUseProviderWithEntitlements } from './useLunarEntitlements'

describe('useLunarEntitlements helpers', () => {
  const disconnected = {
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
    ...disconnected,
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
    expect(canUseProviderWithEntitlements('ollama', disconnected)).toBe(true)
    expect(canUseProviderWithEntitlements('groq', disconnected)).toBe(false)
    expect(canUseProviderWithEntitlements('groq', connected)).toBe(true)
  })
})
