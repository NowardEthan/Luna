import type { PreferencesSharedProps } from '../settingsSections'

export function MemorySection({
  memoryCrossChatEnabled,
  onMemoryCrossChatToggle,
  memoryConversationSearchEnabled,
  onMemoryConversationSearchToggle,
  disabled,
}: PreferencesSharedProps) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title font-semibold text-fg">Memória</h2>
        <p className="mt-1 text-ui text-fg-muted">
          O que a Luna recorda entre conversas e como pesquisa o histórico.
        </p>
      </header>
      <div className="flex max-w-md flex-col gap-2">
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-line px-3 py-2.5 text-left text-ui text-fg-dim hover:bg-white/[0.04] disabled:opacity-40"
          onClick={onMemoryCrossChatToggle}
        >
          Memória entre conversas:{' '}
          <span className="text-fg">
            {memoryCrossChatEnabled ? 'ligada' : 'desligada'}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-line px-3 py-2.5 text-left text-ui text-fg-dim hover:bg-white/[0.04] disabled:opacity-40"
          onClick={onMemoryConversationSearchToggle}
        >
          Busca em conversas antigas:{' '}
          <span className="text-fg">
            {memoryConversationSearchEnabled ? 'ligada' : 'desligada'}
          </span>
        </button>
      </div>
    </div>
  )
}
