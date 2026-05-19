import { LunarAccountChip } from './lunar/LunarAccountChip'
import { PersonalityControls } from './PersonalityControls'
import { LocaleSelect } from './translation/LocaleSelect'
import { ReasoningToggle } from './ReasoningToggle'
import type { ChatPersonalityId } from '../lib/chatPersonality'

type Props = {
  reasoningEnabled: boolean
  onReasoningChange: (enabled: boolean) => void
  personalityId: ChatPersonalityId
  onPersonalityChange: (id: ChatPersonalityId) => void
  onNewConversation: () => void
  onOpenSettings?: () => void
  onOpenLunarAccount?: () => void
  disabled?: boolean
}

function PreferenceControls({
  reasoningEnabled,
  onReasoningChange,
  personalityId,
  onPersonalityChange,
  disabled,
}: Pick<
  Props,
  | 'reasoningEnabled'
  | 'onReasoningChange'
  | 'personalityId'
  | 'onPersonalityChange'
  | 'disabled'
>) {
  return (
    <>
      <ReasoningToggle
        enabled={reasoningEnabled}
        onChange={onReasoningChange}
        disabled={disabled}
      />
      <LocaleSelect disabled={disabled} />
      <span className="hidden h-5 w-px shrink-0 bg-line sm:block" aria-hidden />
      <PersonalityControls
        value={personalityId}
        onChange={onPersonalityChange}
        disabled={disabled}
        variant="toolbar"
      />
    </>
  )
}

export function ChatSessionToolbar({
  reasoningEnabled,
  onReasoningChange,
  personalityId,
  onPersonalityChange,
  onNewConversation,
  onOpenSettings,
  onOpenLunarAccount,
  disabled,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      role="toolbar"
      aria-label="Opções da conversa"
    >
      <LunarAccountChip
        variant="compact"
        onOpenAccount={onOpenLunarAccount}
        className="order-first sm:order-none"
      />

      <details className="relative max-sm:block sm:hidden">
        <summary className="luna-btn-secondary cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
          Preferências
        </summary>
        <div className="absolute right-0 z-20 mt-1.5 flex min-w-[13rem] flex-col gap-1 rounded-xl border border-line bg-popover p-1.5 shadow-overlay">
          <PreferenceControls
            reasoningEnabled={reasoningEnabled}
            onReasoningChange={onReasoningChange}
            personalityId={personalityId}
            onPersonalityChange={onPersonalityChange}
            disabled={disabled}
          />
        </div>
      </details>

      <div className="luna-toolbar-pill hidden sm:flex">
        <PreferenceControls
          reasoningEnabled={reasoningEnabled}
          onReasoningChange={onReasoningChange}
          personalityId={personalityId}
          onPersonalityChange={onPersonalityChange}
          disabled={disabled}
        />
      </div>

      <LunarAccountChip
        variant="toolbar"
        onOpenAccount={onOpenLunarAccount}
        className="hidden lg:flex"
      />

      {onOpenSettings ? (
        <button
          type="button"
          onClick={onOpenSettings}
          disabled={disabled}
          className="luna-btn-secondary"
          title="Definições"
        >
          Definições
        </button>
      ) : null}

      <button
        type="button"
        onClick={onNewConversation}
        disabled={disabled}
        className="luna-btn-primary"
      >
        Nova conversa
      </button>
    </div>
  )
}
