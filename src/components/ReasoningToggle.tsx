type Props = {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function ReasoningToggle({ enabled, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      title="Pede pensamento explícito à API. Modelos como Ring já pensam por defeito — o bloco aparece fechado, só com o texto completo (traduzido pelo motor à parte, sem IA de chat). Mais lento com alguns modelos."
      onClick={() => onChange(!enabled)}
      className={
        enabled
          ? 'rounded-lg bg-accent/18 px-2.5 py-1.5 text-ui font-medium text-accent transition-colors hover:bg-accent/26 disabled:opacity-40'
          : 'rounded-lg px-2.5 py-1.5 text-ui font-medium text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg-dim disabled:opacity-40'
      }
    >
      Pensamento
    </button>
  )
}
