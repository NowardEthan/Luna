import { PersonalityControls } from '../../../components/PersonalityControls'
import { LocaleSelect } from '../../../components/translation/LocaleSelect'
import { Switch } from '../../../components/ui/Switch'
import { isLlmStreamingAvailable } from '../../../lib/llmStreamClient'
import type { PreferencesSharedProps } from '../settingsSections'
import { useTranslation } from 'react-i18next'

export function ConversationSection({
  reasoningEnabled,
  onReasoningChange,
  personalityId,
  onPersonalityChange,
  streamingEnabled,
  onStreamingChange,
  disabled,
}: PreferencesSharedProps) {
  const { t } = useTranslation()
  const streamAvailable = isLlmStreamingAvailable()

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_conversation_label', 'Conversa')}</h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t('settings.section_conversation_desc', 'Raciocínio, idioma de tradução e tom da assistente.')}
        </p>
      </header>
      
      <div className="luna-card space-y-8">
        
        <div className="flex flex-col gap-6">
          <Switch
            label="Raciocínio explícito"
            description="Pede raciocínio explicíto à API. Pode ser mais lento nalguns modelos."
            checked={reasoningEnabled}
            onChange={onReasoningChange}
            disabled={disabled}
          />

          <Switch
            label={t('settings.streaming_label')}
            description={!streamAvailable ? t('settings.streaming_env_notice', 'Indisponível neste ambiente — inicie o servidor Luna.') : undefined}
            checked={streamingEnabled}
            onChange={(c) => onStreamingChange(c)}
            disabled={disabled || !streamAvailable}
          />
        </div>

        <div className="h-px w-full bg-line" aria-hidden />

        <div className="flex flex-wrap items-center gap-4">
          <LocaleSelect disabled={disabled} />
          <PersonalityControls
            value={personalityId}
            onChange={onPersonalityChange}
            disabled={disabled}
            variant="toolbar"
          />
        </div>
      </div>
    </div>
  )
}
