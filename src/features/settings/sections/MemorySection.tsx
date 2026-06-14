import { useTranslation } from 'react-i18next'
import { Switch } from '../../../components/ui/Switch'
import type { PreferencesSharedProps } from '../settingsSections'

export function MemorySection({
  memoryCrossChatEnabled,
  onMemoryCrossChatToggle,
  memoryConversationSearchEnabled,
  onMemoryConversationSearchToggle,
  disabled,
}: PreferencesSharedProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_memory_label', 'Memória')}</h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t('settings.memory_hint', 'O que a Luna recorda entre conversas e como pesquisa o histórico.')}
        </p>
      </header>
      
      <div className="luna-card">
        <div className="flex max-w-2xl flex-col gap-6">
          <Switch
            label={t('settings.memory_cross_chat', 'Memória entre conversas:')}
            description="Permite que a Luna guarde informações úteis (preferências, factos) de uma conversa para usar noutras."
            checked={memoryCrossChatEnabled}
            onChange={() => onMemoryCrossChatToggle()}
            disabled={disabled}
          />
          <Switch
            label={t('settings.memory_search', 'Busca em conversas antigas:')}
            description="Se ativada, a Luna pode pesquisar o teu histórico para recuperar contexto passado."
            checked={memoryConversationSearchEnabled}
            onChange={() => onMemoryConversationSearchToggle()}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
