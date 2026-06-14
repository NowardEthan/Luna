import { RagControls } from '../../../components/RagControls'
import type { PreferencesSharedProps } from '../settingsSections'
import { useTranslation } from 'react-i18next'

export function DocumentsSection({
  ragEnabled,
  onRagEnabledChange,
}: PreferencesSharedProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_documents_label', 'Documentos (RAG)')}</h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t('settings.documents_hint', 'Indexação local de pastas e ficheiros para contexto nas respostas.')}
        </p>
      </header>
      
      <div className="luna-card max-w-3xl">
        <RagControls ragEnabled={ragEnabled} onRagEnabledChange={onRagEnabledChange} variant="settings" />
      </div>
    </div>
  )
}
