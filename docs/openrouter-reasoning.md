# OpenRouter — duas APIs, dois formatos de «pensamento»

A Luna fala com o OpenRouter pelo endpoint **`POST /v1/chat/completions`** (formato OpenAI Chat).

A documentação em [Create a response](https://openrouter.ai/docs/api/api-reference/responses/create-responses) descreve outra API: **`POST /v1/responses`** (OpenResponses). O campo `reasoning` tem forma e o stream de resposta são **diferentes**.

## Comparação rápida

| | Chat Completions (`/chat/completions`) | Responses API (`/responses`) |
|---|---|---|
| **Usado pela Luna hoje** | Sim | Não |
| **Corpo** | `messages[]` | `input` / itens estruturados |
| **`reasoning` no pedido** | `effort`, `exclude`, `max_tokens`, `summary` (guia [Reasoning Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)) | `effort`, `enabled`, `max_tokens`, `summary` — **sem** `exclude` |
| **Pensamento na resposta** | Campo `reasoning` / `reasoning_content` na mensagem SSE | Itens `output[]` com tipo `reasoning` / `reasoning_text` |

Não misturar o JSON da API Responses no pedido de chat — o upstream pode devolver **402** ou **400** («Provider returned error»).

## O que a Luna envia (chat completions)

Com o toggle **Raciocínio** ligado:

```json
{
  "reasoning": {
    "effort": "medium",
    "exclude": false
  }
}
```

Com o toggle desligado (modelo normal):

```json
{
  "reasoning": { "effort": "none" }
}
```

Modelos **`:free`** (ex. `poolside/laguna-m.1:free`): o parâmetro `reasoning` **não é enviado** — muitos free tiers não suportam o modo thinking da API.

Modelos nativos (ex. Ring) com toggle desligado: `effort` baixo + `exclude: true` (pensar sem devolver tokens).

## Variáveis `.env`

- `OPENROUTER_REASONING_EFFORT` — `low` | `medium` | `high` | …
- `OPENROUTER_REASONING_EFFORT_OFF` — esforço quando o toggle está desligado mas o modelo exige thinking interno

## Futuro: API Responses

Migrar para `/v1/responses` exigiria novo parser de stream, conversão de mensagens e testes por modelo. Até lá, o chat simples e o agente continuam em **chat completions** com o `reasoning` alinhado ao guia oficial.
