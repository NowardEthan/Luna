import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  invokeMcpTool,
  mcpRegistryToolName,
  parseMcpRegistryName,
} from './mcpClient'
import type { McpServerConfig } from './storage'

describe('mcpClient registry names', () => {
  it('round-trips server and tool ids', () => {
    const name = mcpRegistryToolName('srv-1', 'search')
    expect(name).toBe('mcp__srv-1__search')
    expect(parseMcpRegistryName(name)).toEqual({
      serverId: 'srv-1',
      toolName: 'search',
    })
  })

  it('rejects invalid names', () => {
    expect(parseMcpRegistryName('not-mcp')).toBeNull()
    expect(parseMcpRegistryName('mcp__only')).toBeNull()
  })
})

describe('invokeMcpTool', () => {
  const server: McpServerConfig = {
    id: 'srv',
    name: 'Test',
    url: 'http://127.0.0.1:8080',
    enabled: true,
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ answer: 42 }),
      }),
    )
    const result = await invokeMcpTool(server, 'search', { q: 'hi' })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.content).toEqual({ answer: 42 })
    }
  })

  it('ping lists tools via GET', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tools: [{ name: 'alpha' }] }),
      }),
    )
    const result = await invokeMcpTool(server, 'ping', {})
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.content).toEqual({ ok: true, tools: ['alpha'] })
    }
  })
})
