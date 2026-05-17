import { PersonalityControls } from './PersonalityControls'
import { LocaleSelect } from './translation/LocaleSelect'
import { ReasoningToggle } from './ReasoningToggle'
import { RagControls } from './RagControls'
import type { ChatPersonalityId } from '../lib/chatPersonality'

type Props = {
  open: boolean
  onClose: () => void
  ragEnabled: boolean
  onRagEnabledChange: (v: boolean) => void
  reasoningEnabled: boolean
  onReasoningChange: (v: boolean) => void
  personalityId: ChatPersonalityId
  onPersonalityChange: (id: ChatPersonalityId) => void
  memoryCrossChatEnabled: boolean
  onMemoryCrossChatToggle: () => void
  memoryConversationSearchEnabled: boolean
  onMemoryConversationSearchToggle: () => void
  disabled?: boolean
}

export function SettingsDrawer({
  open,
  onClose,
  ragEnabled,
  onRagEnabledChange,
  reasoningEnabled,
  onReasoningChange,
  personalityId,
  onPersonalityChange,
  memoryCrossChatEnabled,
  onMemoryCrossChatToggle,
  memoryConversationSearchEnabled,
  onMemoryConversationSearchToggle,
  disabled,
}: Props) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[45] bg-black/50 md:hidden"
        aria-label="Fechar definições"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-line bg-sidebar shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Definições"
      >
        <header className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <h2 className="text-title font-semibold text-fg">Definições</h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-ui text-fg-muted hover:bg-white/[0.06]"
            onClick={onClose}
          >
            Fechar
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          <section>
            <h3 className="mb-2 text-caption font-medium uppercase tracking-wide text-fg-muted">
              Conversa
            </h3>
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
          </section>
          <section>
            <h3 className="mb-2 text-caption font-medium uppercase tracking-wide text-fg-muted">
              Documentos (RAG)
            </h3>
            <RagControls ragEnabled={ragEnabled} onRagEnabledChange={onRagEnabledChange} />
          </section>
          <section>
            <h3 className="mb-2 text-caption font-medium uppercase tracking-wide text-fg-muted">
              Memória
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg border border-line px-3 py-2 text-left text-ui text-fg-dim hover:bg-white/[0.04] disabled:opacity-40"
                onClick={onMemoryCrossChatToggle}
              >
                Memória entre conversas: {memoryCrossChatEnabled ? 'ligada' : 'desligada'}
              </button>
              <button
                type="button"
                disabled={disabled}
                className="rounded-lg border border-line px-3 py-2 text-left text-ui text-fg-dim hover:bg-white/[0.04] disabled:opacity-40"
                onClick={onMemoryConversationSearchToggle}
              >
                Busca em conversas antigas:{' '}
                {memoryConversationSearchEnabled ? 'ligada' : 'desligada'}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
