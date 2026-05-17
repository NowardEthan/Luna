/**
 * Ferramentas de memória persistente (`save_memory`, `configure_memories`).
 */
import { memoryKindsForPrompt } from './memoryKinds'

export const MEMORY_TOOL_SYSTEM_SUPPLEMENT =
  '\n\n---\n\n' +
  '**Memória persistente** (notas `save_memory` + resumo entre chats): grava com frequência o que for **útil em conversas futuras** — não esperes só um pedido formal.\n\n' +
  '**Grava de imediato** (chama `save_memory` no mesmo turno, pode ser mais de uma chamada) quando souberes:\n' +
  '- nome, apelido, como a pessoa quer ser tratada;\n' +
  '- preferências estáveis (tom, idioma, horários, gostos claros);\n' +
  '- projecto, stack, ferramentas, papel profissional ou objectivos em curso;\n' +
  '- restrições (“não quero X”, alergias, limites);\n' +
  '- a pessoa pede para lembrar / guardar / anotar.\n\n' +
  'Se a pessoa disser que é programador, que trabalha na Luna/arquitetura, ou revelar condições relevantes (ex. TDAH), **grava** — não basta mencionar no pensamento.\n\n' +
  '**Tipos (`kind`)** — escolhe um por nota:\n' +
  memoryKindsForPrompt() +
  '\n\nUsa `tags` (array curto, opcional) para projectos ou temas transversais (ex. `["lumen","luna-v1"]`). ' +
  'Usa `configure_memories` para uma mensagem curta no painel Memórias ou para destacar um tipo quando a conversa girar à volta disso.\n\n' +
  '**Não graves** segredos sensíveis sem contexto; nem só porque a conversa foi íntima/meta — aí conversa primeiro. ' +
  'Factos neutros do projecto ou da identidade da pessoa **devem** ser gravados mesmo em conversa meta.\n\n' +
  'Usa `replace_of_note_id` só para actualizar uma nota listada abaixo; para nota nova **omite** esse campo.\n' +
  'Depois de gravar, responde em texto normal (a app já executou a ferramenta).'

/** Definição OpenAI-compatible para `POST /chat/completions`. */
export const SAVE_MEMORY_TOOLS: unknown[] = [
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Guarda uma nota na memória persistente da Luna (só neste computador). Usa várias vezes no mesmo turno se houver vários factos. Inclui `kind` e `tags` quando fizer sentido.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título curto (ex.: "Nome", "Projecto Luna", "Tom preferido").',
          },
          detail: {
            type: 'string',
            description: 'O que guardar (1–3 frases claras).',
          },
          kind: {
            type: 'string',
            enum: [
              'identity',
              'preference',
              'project',
              'constraint',
              'health',
              'context',
              'other',
            ],
            description:
              'Tipo da memória — organiza o painel Memórias e o contexto futuro.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Opcional: etiquetas curtas (projectos, temas). Máx. ~8.',
          },
          replace_of_note_id: {
            type: 'string',
            description:
              'Opcional: id de uma nota existente (listada no system) para substituir em vez de criar nova.',
          },
        },
        required: ['title', 'detail', 'kind'],
        additionalProperties: false,
      },
    },
  },
]

export const CONFIGURE_MEMORIES_TOOLS: unknown[] = [
  {
    type: 'function',
    function: {
      name: 'configure_memories',
      description:
        'Ajusta o painel Memórias na interface (mensagem curta ou secção em destaque). Não grava factos — usa `save_memory` para isso.',
      parameters: {
        type: 'object',
        properties: {
          panel_hint: {
            type: 'string',
            description:
              'Mensagem curta sob o título do painel (ex.: foco desta conversa). Omitir ou string vazia para limpar.',
          },
          emphasize_kind: {
            type: 'string',
            enum: [
              'identity',
              'preference',
              'project',
              'constraint',
              'health',
              'context',
              'other',
            ],
            description:
              'Destaca visualmente uma secção no painel (ex.: `project` durante trabalho no Lumen).',
          },
          clear_emphasis: {
            type: 'boolean',
            description: 'Se true, remove o destaque de secção.',
          },
        },
        additionalProperties: false,
      },
    },
  },
]

export const MEMORY_AGENT_TOOLS: unknown[] = [
  ...SAVE_MEMORY_TOOLS,
  ...CONFIGURE_MEMORIES_TOOLS,
]
