import { describe, expect, it, beforeEach, vi } from 'vitest'
import { toolRegistry } from './ToolRegistry'
import {
  registerBuiltinTools,
  resetBuiltinToolsForTests,
  assertBuiltinToolsRegistered,
} from '../tools/registerBuiltin'
import { executeToolCall } from '../../agent/executeTools'
import type { AgentTurnInput } from '../../agent/types'
describe('ToolRegistry', () => {
  beforeEach(() => {
    resetBuiltinToolsForTests()
    registerBuiltinTools()
  })

  it('regista ferramentas built-in com schemas válidos', () => {
    const schemas = toolRegistry.getSchemas() as {
      type: string
      function: { name: string; parameters?: unknown }
    }[]
    expect(schemas.length).toBeGreaterThan(10)
    const names = schemas.map((s) => s.function.name)
    expect(names).toContain('save_memory')
    expect(names).toContain('read_file')
    expect(names).toContain('web_search')
    expect(names).toContain('luna-finances__add_transaction')
    for (const s of schemas) {
      expect(s.type).toBe('function')
      expect(s.function.name.length).toBeGreaterThan(0)
    }
  })

  it('snapshot estável de nomes de tools', () => {
    const names = toolRegistry.listNames().sort()
    expect(names).toMatchSnapshot()
  })

  it('não permite nomes duplicados', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const before = toolRegistry.listNames().length
    toolRegistry.register({
      name: 'save_memory',
      family: 'test',
      schema: {},
      handler: async () => ({
        content: '{}',
        stepSummary: '',
        ok: true,
        step: { tool: 'save_memory', label: '', summary: '', ok: true },
      }),
    })
    expect(toolRegistry.listNames().length).toBe(before)
    expect(warn).toHaveBeenCalledWith(
      '[Luna] Ferramenta duplicada ignorada: save_memory',
    )
    warn.mockRestore()
  })

  it('assertBuiltinToolsRegistered passa após registo', () => {
    expect(() => assertBuiltinToolsRegistered()).not.toThrow()
  })

  it('executeToolCall save_memory com ctx mock', async () => {
    const notes: { id: string; title: string }[] = []
    const ctx = {
      assistantMsgId: 'a1',
      getMemoryNotes: () => notes,
      setMemoryNotes: (n: typeof notes) => {
        notes.length = 0
        notes.push(...n)
      },
      nextId: () => 'n1',
    } as unknown as AgentTurnInput

    const result = await executeToolCall(
      {
        type: 'function',
        function: {
          name: 'save_memory',
          arguments: JSON.stringify({
            title: 'Teste',
            detail: 'Nota de teste',
            kind: 'other',
          }),
        },
      },
      ctx,
      { memorySaved: false },
    )
    expect(result.ok).toBe(true)
  })

  it('executeToolCall rejeita ferramenta desconhecida', async () => {
    const result = await executeToolCall(
      {
        type: 'function',
        function: { name: 'ferramenta_inexistente', arguments: '{}' },
      },
      { getMemoryNotes: () => [], setMemoryNotes: () => {}, nextId: () => 'x' } as unknown as AgentTurnInput,
      { memorySaved: false },
    )
    expect(result.ok).toBe(false)
  })
})

describe('Registo de tools no boot', () => {
  it('registerBuiltinTools só deve ser importado em AppProviders em produção', () => {
    expect(typeof registerBuiltinTools).toBe('function')
  })
})
