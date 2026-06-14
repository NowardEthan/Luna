import { describe, expect, it } from 'vitest'
import {
  getUsageAlertLevel,
  isQuotaExceeded,
  shouldCountCloudTurn,
} from './lunaCloudTurnPolicy'
import { mapPipelineToBreakdownKey } from './mapPipelineBreakdown'

describe('lunaCloudTurnPolicy', () => {
  it('não conta turno local ou BYOK', () => {
    expect(
      shouldCountCloudTurn({ planId: 'pro', isCoreLocal: true }),
    ).toBe(false)
    expect(
      shouldCountCloudTurn({ planId: 'byok', isCoreLocal: false }),
    ).toBe(false)
    expect(
      shouldCountCloudTurn({
        planId: 'plus',
        isCoreLocal: false,
        quotaFallbackLocal: true,
      }),
    ).toBe(false)
  })

  it('conta turno cloud em planos com cota', () => {
    expect(
      shouldCountCloudTurn({ planId: 'plus', isCoreLocal: false }),
    ).toBe(true)
  })

  it('detecta cota esgotada', () => {
    expect(isQuotaExceeded(20, 20)).toBe(true)
    expect(isQuotaExceeded(19, 20)).toBe(false)
    expect(isQuotaExceeded(100, null)).toBe(false)
  })

  it('níveis de alerta', () => {
    expect(getUsageAlertLevel(69)).toBe('none')
    expect(getUsageAlertLevel(70)).toBe('warn70')
    expect(getUsageAlertLevel(90)).toBe('warn90')
    expect(getUsageAlertLevel(100)).toBe('atLimit')
  })
})

describe('mapPipelineToBreakdownKey', () => {
  it('mapeia profundidade do tálamo', () => {
    expect(
      mapPipelineToBreakdownKey({
        analise: { profundidade: 'complexo' },
      }),
    ).toBe('alto')
  })

  it('fallback para moderado', () => {
    expect(mapPipelineToBreakdownKey({})).toBe('moderado')
  })
})
