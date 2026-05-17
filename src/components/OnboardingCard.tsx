const STORAGE_KEY = 'luna-onboarding-v1'

type Props = {
  onDismiss: () => void
}

export function readOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function OnboardingCard({ onDismiss }: Props) {
  return (
    <li className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface/40 px-5 py-4 shadow-soft">
      <h3 className="text-body font-semibold tracking-tight text-fg">Bem-vindo à Luna</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-ui text-fg-dim">
        <li>
          <strong className="text-fg">Chat</strong> para conversa geral;{' '}
          <strong className="text-fg">IDE</strong> para editar ficheiros e correr comandos.
        </li>
        <li>
          No IDE usa <code className="rounded bg-raised px-1">@ficheiro</code> e outras menções.
        </li>
        <li>Escolhe o modelo no compositor — atalho <kbd className="rounded bg-raised px-1">Ctrl+K</kbd>.</li>
      </ul>
      <button
        type="button"
        className="luna-btn-primary mt-4"
        onClick={onDismiss}
      >
        Entendi
      </button>
    </li>
  )
}
