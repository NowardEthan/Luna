import { RagControls } from '../../../components/RagControls'
import type { PreferencesSharedProps } from '../settingsSections'

export function DocumentsSection({
  ragEnabled,
  onRagEnabledChange,
}: PreferencesSharedProps) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title font-semibold text-fg">Documentos (RAG)</h2>
        <p className="mt-1 text-ui text-fg-muted">
          Indexação local de pastas e ficheiros para contexto nas respostas.
        </p>
      </header>
      <RagControls ragEnabled={ragEnabled} onRagEnabledChange={onRagEnabledChange} />
    </div>
  )
}
