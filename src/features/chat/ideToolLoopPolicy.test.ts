import { describe, expect, it } from 'vitest'
import {
  coreResponseLooksLikeToolStub,
  shouldRunIdeAgentLoop,
  shouldRunIdeLightReview,
  userRequestsForgeAction,
} from './ideToolLoopPolicy'
import type { LunaCoreResultado } from '../../types/lunaCoreResult'

const baseResultado = (): LunaCoreResultado => ({
  pipeline: { politica: { acao: 'responder', modo: 'pedido_codigo' } },
  analise: { analise: { intencao: 'pedido_codigo', complexidade: 'baixa' } },
  resposta: { texto: '{"action": "read_file", "path": "modelo.py"}' },
})

describe('ideToolLoopPolicy', () => {
  it('detecta JSON de tool no texto do Core', () => {
    expect(coreResponseLooksLikeToolStub(baseResultado())).toBe(true)
  })

  it('usa revisão leve para @ficheiro + pedido de revisão', () => {
    expect(
      shouldRunIdeLightReview('@modelo.py da uma olhada', [
        { kind: 'file', ref: 'modelo.py', label: '@modelo.py' },
      ]),
    ).toBe(true)
    expect(
      shouldRunIdeAgentLoop(baseResultado(), '@modelo.py da uma olhada', [
        { kind: 'file', ref: 'modelo.py', label: '@modelo.py' },
      ]),
    ).toBe(false)
  })

  it('activa agente quando Core devolve stub sem menção de ficheiro', () => {
    expect(
      shouldRunIdeAgentLoop(baseResultado(), 'lê modelo.py no disco', []),
    ).toBe(true)
  })

  it('detecta pedido de criar .env no projecto', () => {
    expect(
      userRequestsForgeAction(
        'consegue estruturar uma pasta .env nele para mim primeiro?',
      ),
    ).toBe(true)
    const r: LunaCoreResultado = {
      pipeline: { politica: { acao: 'responder' } },
      analise: { analise: { intencao: 'conversa_casual' } },
      resposta: { texto: 'No explorador clica Novo ficheiro…' },
    }
    expect(
      shouldRunIdeAgentLoop(
        r,
        'consegue estruturar uma pasta .env nele para mim primeiro?',
        [],
        'agent',
      ),
    ).toBe(true)
  })

  it('não activa agente em modo Chat do composer', () => {
    expect(
      shouldRunIdeAgentLoop(baseResultado(), 'lê modelo.py no disco', [], 'chat'),
    ).toBe(false)
  })

  it('não activa agente em conversa casual simples', () => {
    const r: LunaCoreResultado = {
      pipeline: { politica: { acao: 'responder' } },
      analise: { analise: { intencao: 'conversa_casual' } },
      resposta: { texto: 'Olá! Como posso ajudar?' },
    }
    expect(shouldRunIdeAgentLoop(r, 'olá', [])).toBe(false)
  })
})
