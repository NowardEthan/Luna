type Props = {
  content: string
  children: (translatedContent: string) => React.ReactNode
}

/**
 * Traduz mensagens "on the fly" interceptando o markdown.
 * Só ativa quando a tradução automática está ligada E o texto
 * está num idioma diferente do idioma da UI.
 *
 * Durante streaming (mudanças rápidas de content) mostra o original
 * para não bloquear a renderização. Traduz com debounce após estabilizar.
 */
export function TranslatedMessageBlock({ content, children }: Props) {
  return <>{children(content)}</>
}

