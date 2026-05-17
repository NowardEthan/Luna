# Ferramentas do agente IDE — Luna v1

## Contexto estilo Cursor

Em cada mensagem no modo IDE, a Luna injecta no system prompt:

- Código do **ficheiro activo** e tabs **dirty**
- **Estado factual** (disco vs editor vs patch pendente)
- **Terminal** recente, **git diff**, **regras** (`.luna/rules`, `AGENTS.md`)
- Trechos do **índice RAG** do workspace (se activo)
- **@mentions** no chat: `@ficheiro.py`, `@Terminal`, `@Git`, `@Regras`

`read_file` e `apply_patch` usam o **buffer do editor** quando o ficheiro está dirty.

## Registo

- Context compiler: [`src/lib/ideContextCompiler.ts`](../src/lib/ideContextCompiler.ts)
- Schemas: [`src/agent/tools/ideToolSchemas.ts`](../src/agent/tools/ideToolSchemas.ts)
- Execução: [`src/agent/executeTools.ts`](../src/agent/executeTools.ts)

## Tools IDE

| Tool | Aprovação | Notas |
|------|-----------|-------|
| `search_codebase` | Não | Pesquisa semântica no índice do workspace |
| `write_file` | Sim* | *Auto se «Aplicar patches auto» ligado |
| `apply_patch` | Sim* | |
| `grep` / `glob` | Não | |
| `run_terminal_command` | Não | |
| `git_*` | commit pendente | |

## Regras de projecto

Coloca ficheiros em `.luna/rules/*.md` com frontmatter:

```yaml
---
globs: "**/*.py"
alwaysApply: false
---
```

Ou `AGENTS.md` na raiz do projecto.

## Ignorar ficheiros na indexação

Use [`.lunaignore`](../.lunaignore) (como `.cursorignore`).
