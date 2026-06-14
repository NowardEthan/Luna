import { describe, expect, it } from 'vitest'
import { parseIdeMentions, resolveMentionPath } from './ideMentions'

describe('parseIdeMentions', () => {
  it('reconhece @ficheiro.py simples na raiz do workspace', () => {
    const m = parseIdeMentions('da uma olhada em @modelo.py')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({
      kind: 'file',
      ref: 'modelo.py',
      label: '@modelo.py',
    })
  })

  it('reconhece caminhos com pasta', () => {
    const m = parseIdeMentions('ver @src/App.tsx')
    expect(m[0]?.ref).toBe('src/App.tsx')
  })

  it('resolve path relativo com workspace root', () => {
    expect(
      resolveMentionPath('modelo.py', 'C:\\Users\\ethan\\Projects\\Test'),
    ).toBe('C:\\Users\\ethan\\Projects\\Test\\modelo.py')
  })
})
