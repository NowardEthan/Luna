import { PersonalityControls } from '../../../components/PersonalityControls'
import { LocaleSelect } from '../../../components/translation/LocaleSelect'
import { ReasoningToggle } from '../../../components/ReasoningToggle'
import { isLlmStreamingAvailable } from '../../../lib/llmStreamClient'
import type { PreferencesSharedProps } from '../settingsSections'

export function ConversationSection({
  reasoningEnabled,
  onReasoningChange,
  personalityId,
  onPersonalityChange,
  streamingEnabled,
  onStreamingChange,
  disabled,
}: PreferencesSharedProps) {
  const streamAvailable = isLlmStreamingAvailable()

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title font-semibold text-fg">Conversa</h2>
        <p className="mt-1 text-ui text-fg-muted">
          Pensamento, idioma de tradução e tom da assistente.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <ReasoningToggle
          enabled={reasoningEnabled}
          onChange={onReasoningChange}
          disabled={disabled}
        />
        <LocaleSelect disabled={disabled} />
        <PersonalityControls
          value={personalityId}
          onChange={onPersonalityChange}
          disabled={disabled}
          variant="toolbar"
        />
      </div>
      <div className="max-w-md">
        <button
          type="button"
          disabled={disabled || !streamAvailable}
          className="w-full rounded-lg border border-line px-3 py-2.5 text-left text-ui text-fg-dim hover:bg-white/[0.04] disabled:opacity-40"
          onClick={() => onStreamingChange(!streamingEnabled)}
          title={
            streamAvailable
              ? undefined
              : 'Requer servidor Luna ou Electron com streaming activo'
          }
        >
          Resposta em streaming:{' '}
          <span className="text-fg">
            {streamingEnabled ? 'ligado' : 'desligado'}
          </span>
          {!streamAvailable ? (
            <span className="mt-1 block text-[10px] text-fg-muted">
              Indisponível neste ambiente — inicie o servidor Luna.
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )
}
