import { describe, expect, it } from 'vitest'
import {
  buildForgeAgentInterpreterBlock,
  interpretForgeTurn,
  shouldContinueToForgeAgent,
} from './forgeAgentInterpreter'

describe('forgeAgentInterpreter', () => {
  it('modo Chat → Luna Core', () => {
    expect(
      interpretForgeTurn({
        userText: 'cria um .env',
        composerMode: 'chat',
      }),
    ).toBe('luna_core_chat')
  })

  it('modo Agente → rota forge_agent (Core depois agente)', () => {
    expect(
      interpretForgeTurn({
        userText: 'estrutura um .env para mim',
        composerMode: 'agent',
      }),
    ).toBe('forge_agent')
  })

  it('shouldContinueToForgeAgent após Core em modo Agente', () => {
    const r = {
      pipeline: { politica: { acao: 'responder' } },
      analise: { analise: { intencao: 'conversa_casual' } },
      resposta: { texto: 'Olá!' },
    }
    expect(
      shouldContinueToForgeAgent(
        'forge_agent',
        r,
        'estrutura um .env',
        [],
        'agent',
      ),
    ).toBe(true)
    expect(
      shouldContinueToForgeAgent(
        'luna_core_chat',
        r,
        'oi',
        [],
        'chat',
      ),
    ).toBe(false)
  })

  it('modo Agente + @ficheiro revisão → light review', () => {
    expect(
      interpretForgeTurn({
        userText: '@app.py da uma olhada',
        mentions: [{ kind: 'file', ref: 'app.py', label: '@app.py' }],
        composerMode: 'agent',
      }),
    ).toBe('light_review')
  })

  it('bloco de interpretação lista tools e proíbe tutoriais', () => {
    const block = buildForgeAgentInterpreterBlock()
    expect(block).toContain('write_file')
    expect(block).toContain('explorador')
    expect(block).toMatch(/não|Não/)
  })
})
