import type { TurnDiagnostics } from '../types/chat'
import { TurnDiagnosticsPanel } from './TurnDiagnosticsPanel'
import { InlineErrorBanner } from './ui/InlineErrorBanner'

type Props = {
  text: string
  diagnostics?: TurnDiagnostics
}

function splitFriendlyAndTechnical(text: string): {
  friendly: string
  technical?: string
} {
  const parts = text.split(/\n\n+/)
  if (parts.length < 2) {
    return { friendly: text.trim() }
  }
  const friendly = parts[0].trim()
  const rest = parts.slice(1).join('\n\n').trim()
  if (!rest) {
    return { friendly: text.trim() }
  }
  const looksTechnical =
    /Groq\s*\(|Together\s*\(|OpenRouter|Ollama|cannot specify|rate limit|TPM|API_KEY|free-models|429|502|HTTP\s+\d|•\s*\w+/i.test(
      rest,
    ) || rest.length > 40
  if (!looksTechnical) {
    return { friendly: text.trim() }
  }
  return { friendly, technical: rest }
}

export function AssistantErrorNotice({ text, diagnostics }: Props) {
  const { friendly, technical } = splitFriendlyAndTechnical(text)
  const isError =
    /não consegui|limite|erro|falhou|tente de novo|nenhum modelo/i.test(
      friendly,
    ) || Boolean(technical)

  if (!isError) return null

  return (
    <InlineErrorBanner
      className="mb-3 max-w-xl"
      details={
        <>
          {technical ? (
            <pre className="max-h-40 overflow-auto rounded-md border border-line bg-canvas/80 p-2 font-mono text-caption leading-snug text-fg-muted whitespace-pre-wrap">
              {technical}
            </pre>
          ) : null}
          <TurnDiagnosticsPanel diagnostics={diagnostics} errorText={text} />
        </>
      }
    >
      {friendly}
    </InlineErrorBanner>
  )
}
