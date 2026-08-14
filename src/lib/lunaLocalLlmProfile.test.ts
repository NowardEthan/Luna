import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_LOCAL_LLM_PROFILE,
  mergeProfileWithRuntimeInfo,
  normalizeBaseUrl,
  profileIsComplete,
  toConfigLuna,
  writeLocalLlmProfile,
  readLocalLlmProfile,
  localModelLabel,
} from './lunaLocalLlmProfile'

describe('lunaLocalLlmProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null
      },
      setItem(key: string, value: string) {
        this.store[key] = value
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normaliza URL base', () => {
    expect(normalizeBaseUrl('127.0.0.1:1234/v1')).toBe('http://127.0.0.1:1234/v1')
    expect(normalizeBaseUrl('http://127.0.0.1:1234/v1/')).toBe(
      'http://127.0.0.1:1234/v1',
    )
  })

  it('merge preenche gaps a partir do runtime', () => {
    const merged = mergeProfileWithRuntimeInfo(
      { ...DEFAULT_LOCAL_LLM_PROFILE, modeloMenor: '', modeloMaior: '' },
      {
        ok: true,
        lunaApiBase: 'http://127.0.0.1:1234/v1',
        modeloMenor: 'menor-id',
        modeloMaior: 'maior-id',
      },
    )
    expect(merged.modeloMenor).toBe('menor-id')
    expect(merged.modeloMaior).toBe('maior-id')
  })

  it('toConfigLuna mapeia perfil completo', () => {
    const cfg = toConfigLuna({
      baseUrl: 'http://127.0.0.1:1234/v1',
      apiKey: 'lm-studio',
      modeloMenor: 'qwen-menor',
      modeloMaior: 'qwen-maior',
      temperaturaMaior: 0.7,
    })
    expect(cfg.modeloMenor).toBe('qwen-menor')
    expect(cfg.modeloMaior).toBe('qwen-maior')
    expect(cfg.temperaturaMaior).toBe(0.7)
  })

  it('persiste e relê perfil', () => {
    writeLocalLlmProfile({
      baseUrl: 'http://127.0.0.1:1234/v1',
      apiKey: 'lm-studio',
      modeloMenor: 'a',
      modeloMaior: 'b',
      temperaturaMaior: 0.85,
    })
    const read = readLocalLlmProfile()
    expect(read.modeloMenor).toBe('a')
    expect(read.modeloMaior).toBe('b')
  })

  it('profileIsComplete exige modelos', () => {
    expect(profileIsComplete(DEFAULT_LOCAL_LLM_PROFILE)).toBe(false)
    expect(
      profileIsComplete({
        ...DEFAULT_LOCAL_LLM_PROFILE,
        modeloMenor: 'x',
        modeloMaior: 'y',
      }),
    ).toBe(true)
  })

  it('localModelLabel mostra um ou dois modelos', () => {
    expect(
      localModelLabel({
        ...DEFAULT_LOCAL_LLM_PROFILE,
        modeloMenor: 'same',
        modeloMaior: 'same',
      }),
    ).toBe('same')
    expect(
      localModelLabel({
        ...DEFAULT_LOCAL_LLM_PROFILE,
        modeloMenor: 'menor',
        modeloMaior: 'maior',
      }),
    ).toBe('menor · maior')
  })
})
