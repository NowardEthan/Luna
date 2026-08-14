import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ReasoningToggle } from '../../components/ReasoningToggle'
import { LunaPhaseIndicator } from '../../components/chat/LunaPhaseIndicator'
import { IdeMentionPicker } from '../../components/ide/IdeMentionPicker'
import type { AssistantTurnPhase } from '../../lib/assistantMessageUi'
import {
  resizeTextareaElement,
  useAutoResizeTextarea,
} from '../../hooks/useAutoResizeTextarea'
import { useIdeComposerMentions } from '../../hooks/useIdeComposerMentions'
import { useComposerDraftText } from '../../lib/composerDraftStore'
import {
  SIMPLE_CHAT_MODEL_LABEL,
  SIMPLE_CHAT_PROVIDER_LABEL,
} from './simpleChatLlmConfig'
import { useForgeComposerMode } from '../../lib/forgeComposerMode'

type Props = {
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  busy: boolean
  workingLabel?: string
  workingPhase?: AssistantTurnPhase
  onStop?: () => void
  reasoningEnabled?: boolean
  onReasoningChange?: (enabled: boolean) => void
  /** Modo agente (IDE/Finanças): mostra modelo LLM em vez de Luna · PAIA */
  modelLabel?: string
  /** Mensagem do toggle reasoning — omitir no chat Luna Core */
  reasoningUnsupportedMsg?: string
  /** Composer IDE: autocomplete @ficheiro, @Terminal, etc. */
  ideComposer?: boolean
  /** Aviso de cota cloud (70% / 90% / 100%). */
  usageQuotaAlert?: string | null
  usageQuotaAlertLevel?: 'warn70' | 'warn90' | 'atLimit'
  onOpenBilling?: () => void
}

export function SimpleChatComposer({
  onSend,
  onKeyDown,
  busy,
  workingLabel,
  workingPhase = 'waiting',
  onStop,
  reasoningEnabled = false,
  onReasoningChange,
  modelLabel,
  reasoningUnsupportedMsg,
  ideComposer = false,
  usageQuotaAlert,
  usageQuotaAlertLevel,
  onOpenBilling,
}: Props) {
  const { t } = useTranslation()
  const draft = useComposerDraftText()
  const canSend = draft.trim().length > 0 && !busy
  const { ref: textareaRef, minHeightPx, maxHeightPx } = useAutoResizeTextarea(
    draft,
    { minHeightPx: 44, maxHeightPx: 240 },
  )

  const mentions = useIdeComposerMentions(
    draft,
    textareaRef,
    ideComposer,
    onKeyDown,
  )
  const forgeMode = useForgeComposerMode()

  const placeholder = ideComposer
    ? t('forge.composer.placeholder', 'Pede alterações ou usa @ficheiro, @Terminal…')
    : t('chat.placeholder', 'Mensagem para a Luna…')

  return (
    <div className="bg-transparent px-4 pb-4 pt-2">
      {usageQuotaAlert ? (
        <div
          className={[
            'mx-auto mb-2 flex max-w-4xl items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[11px]',
            usageQuotaAlertLevel === 'atLimit'
              ? 'border-warning/30 bg-warning/10 text-warning'
              : usageQuotaAlertLevel === 'warn90'
                ? 'border-warning/25 bg-warning/5 text-warning'
                : 'border-line-subtle bg-canvas text-fg-muted',
          ].join(' ')}
          role="status"
        >
          <span>{usageQuotaAlert}</span>
          {usageQuotaAlertLevel === 'warn90' && onOpenBilling ? (
            <button
              type="button"
              onClick={onOpenBilling}
              className="shrink-0 font-semibold text-accent hover:underline"
            >
              Ver planos
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="luna-input-well relative mx-auto flex max-w-4xl flex-col p-2">
        {ideComposer && mentions.mentionTrigger ? (
          <IdeMentionPicker
            suggestions={mentions.mentionSuggestions}
            activeIndex={mentions.mentionIndex}
            onPick={mentions.pickMention}
          />
        ) : null}
        <textarea
          ref={textareaRef}
          id="msg-input"
          value={draft}
          onChange={(e) => {
            mentions.onDraftChange(e.target.value)
            resizeTextareaElement(e.currentTarget, minHeightPx, maxHeightPx)
          }}
          onKeyDown={mentions.handleKeyDown}
          disabled={busy}
          rows={1}
          placeholder={placeholder}
          className="luna-composer-textarea block w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-fg placeholder:text-fg-muted focus:outline-none disabled:opacity-60"
          aria-label={placeholder}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {ideComposer ? (
              <div
                className="flex rounded-lg border border-line-subtle bg-raised/50 p-0.5"
                role="group"
                aria-label={t('forge.composer.modeLabel', 'Modo do composer')}
              >
                {(['agent', 'chat'] as const).map((m) => {
                  const active = forgeMode.mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => forgeMode.setMode(m)}
                      className={[
                        'rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors',
                        active
                          ? 'bg-accent text-white'
                          : 'text-fg-muted hover:text-fg',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {m === 'agent'
                        ? t('forge.composer.modeAgent', 'Agente')
                        : t('forge.composer.modeChat', 'Chat')}
                    </button>
                  )
                })}
              </div>
            ) : null}
            {onReasoningChange ? (
              <ReasoningToggle
                enabled={reasoningEnabled}
                onChange={onReasoningChange}
                unsupportedMsg={reasoningUnsupportedMsg}
              />
            ) : null}
            <p className="text-[10px] font-medium text-fg-muted">
              {modelLabel ?? `${SIMPLE_CHAT_PROVIDER_LABEL} · ${SIMPLE_CHAT_MODEL_LABEL}`}
            </p>
          </div>
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="shrink-0 rounded-full bg-raised px-4 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg"
            >
              {t('chat.stop', 'Parar')}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={onSend}
              className="luna-btn-primary shrink-0 rounded-full px-5 py-1.5 text-[12px]"
            >
              {t('chat.send', 'Enviar')}
            </button>
          )}
        </div>
      </div>
      {busy ? (
        <p
          key={workingPhase}
          className="luna-composer-status mx-auto mt-2 flex max-w-4xl items-center gap-2.5 rounded-lg border border-accent/10 bg-accent/5 px-3 py-2 text-[11px] text-fg-muted"
          aria-live="polite"
          role="status"
        >
          <LunaPhaseIndicator phase={workingPhase} size="sm" />
          <span className="min-w-0 flex-1 font-medium text-fg-dim">
            {workingLabel ?? t('composer.working')}
          </span>
        </p>
      ) : null}
    </div>
  )
}
