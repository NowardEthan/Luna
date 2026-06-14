/**
 * Mensagens amigáveis para erros de provedores LLM.
 */
export function humanizeLlmError(raw: string): string {
  const text = raw.trim()
  if (!text) return text

  if (/402|payment required|insufficient credits|provider returned error/i.test(text)) {
    return (
      'Não foi possível obter resposta do OpenRouter (erro 402).\n\n' +
      'Isto costuma significar créditos ou permissões na conta OpenRouter:\n' +
      '• Adiciona créditos em https://openrouter.ai/credits (modelos :free podem exigir saldo ou limite diário).\n' +
      '• Em https://openrouter.ai/settings/privacy activa «Model training» para modelos gratuitos.\n' +
      '• Experimenta desligar o toggle «Raciocínio» junto ao campo de mensagem.\n\n' +
      `Detalhe técnico: ${text}`
    )
  }

  if (/429|rate limit/i.test(text)) {
    return (
      'Limite de pedidos do OpenRouter atingido (429).\n\n' +
      'Aguarda alguns minutos ou adiciona créditos na conta.\n\n' +
      `Detalhe técnico: ${text}`
    )
  }

  return text
}
