const INTENCAO: Record<string, string> = {
  conversa_casual: 'Conversa casual',
  pedido_codigo: 'Pedido de código',
  pedido_ajuda: 'Pedido de ajuda',
  pergunta_factual: 'Pergunta factual',
  recall: 'Consulta de memória',
  criacao_conteudo: 'Criação de conteúdo',
}

const RISCO: Record<string, string> = {
  nenhum: 'Sem risco',
  baixo: 'Risco baixo',
  medio: 'Risco médio',
  alto: 'Risco alto',
  critico: 'Risco crítico',
}

const COMPLEXIDADE: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

const ACAO_POLITICA: Record<string, string> = {
  responder: 'Responder',
  recusar: 'Recusar',
  confirmar: 'Confirmar',
  executar: 'Executar',
}

const TOM: Record<string, string> = {
  casual: 'Casual',
  tecnico: 'Técnico',
  empatico: 'Empático',
  direto: 'Direto',
  formal: 'Formal',
}

const MEMORIA_ACAO: Record<string, string> = {
  armazenar: 'Guardar fato',
  ignorar: 'Não persistir',
  confirmar: 'Pedir confirmação',
  atualizar: 'Atualizar memória',
}

const MEMORIA_TIPO: Record<string, string> = {
  fato_geral: 'Fato geral',
  preferencia: 'Preferência',
  recall: 'Recall',
  informacao_sensivel: 'Info sensível',
  confirmacao_usuario: 'Confirmação',
}

export function labelIntencao(v?: string): string {
  if (!v) return '—'
  return INTENCAO[v] ?? v.replace(/_/g, ' ')
}

export function labelRisco(v?: string): string {
  if (!v) return '—'
  return RISCO[v] ?? v
}

export function labelComplexidade(v?: string): string {
  if (!v) return '—'
  return COMPLEXIDADE[v] ?? v
}

export function labelPoliticaAcao(v?: string): string {
  if (!v) return '—'
  return ACAO_POLITICA[v] ?? v
}

export function labelTom(v?: string): string {
  if (!v) return '—'
  return TOM[v] ?? v
}

export function labelMemoriaAcao(v?: string): string {
  if (!v) return '—'
  return MEMORIA_ACAO[v] ?? v
}

export function labelMemoriaTipo(v?: string): string {
  if (!v) return '—'
  return MEMORIA_TIPO[v] ?? v
}
