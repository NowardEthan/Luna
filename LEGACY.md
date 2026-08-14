# Orbit — Repositório legado

**Status:** congelado · **desde:** junho de 2026  
**Desenvolvimento ativo:** não

---

## O que é este repositório

Este projeto (**Orbit**, historicamente também referido como *Luna desktop*) foi o primeiro host visual da Luna: Electron + React + servidor Python, com chat, IDE (Forge), agente com ferramentas, marketplace e add-ons.

Ele nasceu antes da arquitetura atual estar madura e acumulou responsabilidades misturadas (UI, backend, runtime, memória, permissões). **Não será evoluído nem reutilizado** como base do próximo sistema.

---

## Sucessor

O caminho ativo está no repositório **Luna Core**:

| Componente | Onde |
|------------|------|
| Identidade, memória, política | `Projects/Luna/core/src/luna-core` |
| Arquitetura alvo | `Projects/Luna/core/Docs/arquitetura_luna_orbit_runtimes.md` |
| Runtime operacional (novo) | `Projects/Luna/runtimes/luna-runtime` |

Hosts futuros (CLI, Forge, shell visual) serão **consumidores do Luna Runtime**, não extensões deste código.

---

## Política deste legado

- **Não** adicionar features
- **Não** refatorar arquitetura
- **Não** migrar código para o runtime novo
- **Pode** executar localmente para referência histórica
- **Pode** consultar docs em `docs/` como registro de decisões passadas

Correções críticas de segurança são opcionais e pontuais — não há roadmap de produto.

---

## Executar (referência)

Os scripts continuam funcionais para quem precisar revisitar o legado:

```bash
npm install
npm run server:install
copy .env.example .env
npm run dev
```

Isso **não** representa a direção futura da Luna.

---

## Lições úteis (conceituais, não código)

O legado validou ideias que o runtime novo deve formalizar:

- A Luna precisa saber **em qual superfície** está (chat vs desenvolvimento vs módulo)
- Contexto de IDE não pode ser um blob improvisado no prompt
- Permissões e execução de ferramentas precisam de camada central, não espalhadas na UI
- Um host visual não deve ser o cérebro operacional

---

*Arquivado como parte da transição para Luna Core + Luna Runtime.*
