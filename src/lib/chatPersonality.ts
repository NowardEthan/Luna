export type ChatPersonalityId =
  | 'conversa'
  | 'equilibrio'
  | 'tecnico'
  | 'desabafo'
  | 'gestora'

export const PERSONALITY_STORAGE_KEY = 'luna-chat-personality'

export type ChatPersonality = {
  id: ChatPersonalityId
  /** Rótulo curto no seletor */
  label: string
  /** Dica ao passar o mouse */
  hint: string
  /** Temperatura da API (0–2): mais baixa = mais previsível */
  temperature: number
  /** Instruções extra no system prompt (vazio = só o núcleo da Luna) */
  systemSuffix: string
}

export const CHAT_PERSONALITIES: Record<ChatPersonalityId, ChatPersonality> = {
  conversa: {
    id: 'conversa',
    label: 'Conversa',
    hint: 'Tom natural e solto — o jeito clássico da Luna.',
    temperature: 0.74,
    systemSuffix:
      'Perfil conversa: em momentos meta (criador, existência no app, limites) mantém calor e curiosidade; em papo técnico podes ser mais directa sem virar relatório.',
  },
  equilibrio: {
    id: 'equilibrio',
    label: 'Equilíbrio',
    hint: 'Entre papo e foco: clara sem virar relatório.',
    temperature: 0.55,
    systemSuffix:
      'Perfil equilíbrio: mantenha o tom amigável, mas quando a pergunta pedir clareza seja um pouco mais organizada; listas curtas só se realmente ajudarem.',
  },
  tecnico: {
    id: 'tecnico',
    label: 'Técnico',
    hint: 'Mais preciso, passos e termos quando fizer sentido.',
    temperature: 0.38,
    systemSuffix:
      'Perfil técnico: priorize precisão e explicar conceitos com calma. Pode usar listas e passos em perguntas práticas; evite rodeios e informalidade demais. Se o assunto tocar em meta ou emoção (frustração, criador, testes), não anule o calor humano: uma frase de presença antes de entrar no técnico.',
  },
  desabafo: {
    id: 'desabafo',
    label: 'Desabafo',
    hint: 'Escuta primeiro; sem pressa em consertar tudo com conselho.',
    temperature: 0.82,
    systemSuffix:
      'Perfil desabafo: escute de verdade. Valide o que a pessoa sente; não minimize. Evite encher de conselhos, bullets ou perguntas em sequência — incorpora uma dúvida só se couber naturalmente. Sem tom de terapeuta clichê.',
  },
  gestora: {
    id: 'gestora',
    label: 'Gestora',
    hint: 'Consultora financeira — números, orçamentos e clareza.',
    temperature: 0.42,
    systemSuffix:
      'Perfil gestora: tom profissional e objectivo. Distinga conta bancária, transação pontual e recorrente; use a tool correcta. Nunca assuma que tudo é "conta corrente".',
  },
}

export const CHAT_PERSONALITY_ORDER: ChatPersonalityId[] = [
  'conversa',
  'equilibrio',
  'tecnico',
  'gestora',
  'desabafo',
]

export function isChatPersonalityId(v: string): v is ChatPersonalityId {
  return v in CHAT_PERSONALITIES
}

export function readStoredPersonality(): ChatPersonalityId {
  try {
    const v = localStorage.getItem(PERSONALITY_STORAGE_KEY)
    if (v && isChatPersonalityId(v)) return v
  } catch {
    /* ignore */
  }
  return 'conversa'
}

export function personalitySystemPrefix(personalityId: ChatPersonalityId): string {
  const p = CHAT_PERSONALITIES[personalityId]
  return p.systemSuffix ? `\n\n${p.systemSuffix}` : ''
}
