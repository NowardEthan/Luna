import { describe, expect, it } from 'vitest'
import {
  envMismatch,
  resolveEffectiveConfig,
  resolveEffectiveLlmMode,
  shouldForceLocalInPipeline,
} from './lunaLlmRuntimeMode'

describe('lunaLlmRuntimeMode + perfil local', () => {
  it('forceLocal quando preferência local', () => {
    expect(shouldForceLocalInPipeline('local')).toBe(true)
    expect(shouldForceLocalInPipeline('cloud')).toBe(false)
  })

  it('resolveEffectiveLlmMode respeita preferência', () => {
    expect(resolveEffectiveLlmMode('cloud', 'local')).toBe('local')
    expect(resolveEffectiveLlmMode('local', 'cloud')).toBe('cloud')
    expect(resolveEffectiveLlmMode('local', 'auto')).toBe('local')
  })

  it('envMismatch só fora de auto', () => {
    expect(envMismatch('local', 'cloud')).toBe(true)
    expect(envMismatch('local', 'auto')).toBe(false)
  })

  it('resolveEffectiveConfig combina runtime e preferência', () => {
    const cfg = resolveEffectiveConfig(
      {
        ok: true,
        detectedMode: 'local',
        lunaApiBase: 'http://127.0.0.1:1234/v1',
        modeloMaior: 'qwen',
      },
      'local',
    )
    expect(cfg.mode).toBe('local')
    expect(cfg.detected).toBe('local')
  })
})
