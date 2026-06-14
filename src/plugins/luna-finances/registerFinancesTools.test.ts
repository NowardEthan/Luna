import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { toolRegistry } from '../../core/registry/ToolRegistry'
import { replaceFinancesState } from '../../features/finances/financesStore'
import { createDefaultFinancesState } from '../../features/finances/financesDefaults'
import {
  registerAllFinancesTools,
  TOOL_PREFIX,
  unregisterAllFinancesTools,
} from './registerFinancesTools'

describe('registerFinancesTools', () => {
  beforeEach(() => {
    unregisterAllFinancesTools()
    const state = createDefaultFinancesState()
    replaceFinancesState(state)
    registerAllFinancesTools()
  })

  afterEach(() => {
    unregisterAllFinancesTools()
  })

  it('regista upsert_account e cria conta', async () => {
    const name = `${TOOL_PREFIX}upsert_account`
    const tool = toolRegistry.get(name)
    expect(tool).toBeDefined()

    const result = await tool!.handler({
      call: { role: 'assistant', tool_calls: [] },
      args: { name: 'Inter', type: 'checking', initialBalance: -0.01 },
      ctx: {} as never,
      effects: { memorySaved: false },
    })

    expect(result.ok).toBe(true)
    expect(result.content).toContain('Inter')
  })

  it('regista add_transaction com handler executável', async () => {
    const name = `${TOOL_PREFIX}add_transaction`
    const tool = toolRegistry.get(name)
    expect(tool).toBeDefined()

    const accountId = createDefaultFinancesState().accounts[0]!.id
    const result = await tool!.handler({
      call: {
        role: 'assistant',
        tool_calls: [
          {
            id: 'c1',
            type: 'function',
            function: {
              name,
              arguments: JSON.stringify({
                accountId,
                amount: 30,
                type: 'expense',
                description: 'Uber',
              }),
            },
          },
        ],
      },
      args: {
        accountId,
        amount: 30,
        type: 'expense',
        description: 'Uber',
      },
      ctx: {} as never,
      effects: { memorySaved: false },
    })

    expect(result.ok).toBe(true)
  })
})
