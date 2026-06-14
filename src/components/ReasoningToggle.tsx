import { showToast } from '../lib/toast'

type Props = {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
  unsupportedMsg?: string
}

export function ReasoningToggle({ enabled, onChange, disabled, unsupportedMsg }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled && !unsupportedMsg}
      title={unsupportedMsg || "Pede raciocínio explícito à API. Modelos como Ring já raciocinam por defeito — o bloco aparece fechado, só com o texto completo. Mais lento com alguns modelos."}
      onClick={() => {
        if (unsupportedMsg) {
          showToast(unsupportedMsg, 'error', 5000)
          return
        }
        if (!disabled) onChange(!enabled)
      }}
      className={
        enabled
          ? 'rounded-lg bg-accent-muted px-2.5 py-1.5 text-ui font-medium text-accent transition-colors hover:bg-raised-hover disabled:opacity-40'
          : `rounded-lg px-2.5 py-1.5 text-ui font-medium transition-colors disabled:opacity-40 ${
              unsupportedMsg 
                ? 'text-fg-muted/50 cursor-help hover:bg-transparent' 
                : 'text-fg-muted hover:bg-raised-hover hover:text-fg-dim'
            }`
      }
    >
      Raciocínio
    </button>
  )
}
