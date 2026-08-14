import { describe, expect, it } from 'vitest'
import { profileToConfigLuna } from '../../electron/lunaCoreBridge.cjs'

describe('lunaCoreBridge profileToConfigLuna', () => {
  it('converte perfil da UI para ConfigLuna', () => {
    const cfg = profileToConfigLuna({
      baseUrl: 'http://127.0.0.1:1234/v1',
      apiKey: 'lm-studio',
      modeloMenor: 'menor',
      modeloMaior: 'maior',
      temperaturaMaior: 0.9,
    })
    expect(cfg).toEqual({
      apiKey: 'lm-studio',
      baseUrl: 'http://127.0.0.1:1234/v1',
      modeloMenor: 'menor',
      modeloMaior: 'maior',
      temperaturaMenor: 0,
      temperaturaMaior: 0.9,
    })
  })

  it('devolve null sem modelos', () => {
    expect(profileToConfigLuna({ baseUrl: 'http://127.0.0.1:1234/v1' })).toBeNull()
  })
})
