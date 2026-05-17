import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

export type LunaSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: LunaSelectOption[]
  disabled?: boolean
  placeholder?: string
  label?: string
  title?: string
  variant?: 'default' | 'toolbar' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
  align?: 'start' | 'end'
  'aria-label'?: string
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={`shrink-0 text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const triggerVariant: Record<NonNullable<Props['variant']>, string> = {
  default:
    'border border-line-subtle bg-surface/95 text-fg-dim shadow-sm hover:border-line hover:bg-raised/70 hover:text-fg',
  toolbar:
    'border border-transparent bg-transparent text-fg-dim hover:bg-raised-hover/90 hover:text-fg',
  ghost:
    'border-0 bg-transparent text-fg-dim hover:bg-raised-hover/70 hover:text-fg',
}

const triggerSize: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-7 min-h-7 gap-1 rounded-md px-2 text-[10px]',
  md: 'h-8 min-h-8 gap-1.5 rounded-lg px-2.5 text-ui',
}

export function Select({
  id: idProp,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Selecionar…',
  label,
  title,
  variant = 'default',
  size = 'md',
  className = '',
  align = 'start',
  'aria-label': ariaLabel,
}: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const listId = `${id}-listbox`
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected?.label ?? placeholder

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const pick = (next: string) => {
    onChange(next)
    close()
  }

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((v) => !v)
    }
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className={`relative inline-flex min-w-0 max-w-full ${className}`.trim()}>
      {label ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : null}
      <div ref={rootRef} className="relative min-w-0 max-w-full">
        <button
          id={id}
          type="button"
          disabled={disabled || options.length === 0}
          title={title ?? display}
          aria-label={ariaLabel ?? label}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          className={`inline-flex w-full min-w-0 max-w-full items-center justify-between font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-45 ${triggerVariant[variant]} ${triggerSize[size]}`}
        >
          <span className="min-w-0 truncate text-left">{display}</span>
          <Chevron open={open} />
        </button>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            className={`luna-select-menu absolute z-50 mt-1 max-h-52 min-w-full overflow-y-auto rounded-lg border border-line bg-popover py-1 shadow-overlay ${
              align === 'end' ? 'right-0' : 'left-0'
            }`}
          >
            {options.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={opt.disabled}
                    onClick={() => pick(opt.value)}
                    className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-ui transition-colors disabled:opacity-40 ${
                      active
                        ? 'bg-accent-muted text-accent'
                        : 'text-fg-dim hover:bg-raised-hover hover:text-fg'
                    }`}
                  >
                    {active ? (
                      <span className="w-3 shrink-0 text-accent" aria-hidden>
                        ✓
                      </span>
                    ) : (
                      <span className="w-3 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 truncate">{opt.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
