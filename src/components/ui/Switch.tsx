import { useId } from 'react'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  className?: string
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className = '',
}: SwitchProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={`group flex items-center justify-between gap-4 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {(label || description) && (
        <div className="flex flex-col flex-1 min-w-0">
          {label && (
            <span className="text-sm font-medium text-fg">{label}</span>
          )}
          {description && (
            <span className="text-xs text-fg-muted mt-0.5 leading-snug">
              {description}
            </span>
          )}
        </div>
      )}
      <div className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`absolute inset-0 rounded-full transition-colors duration-300 ease-in-out ${
            checked ? 'bg-accent' : 'bg-line border border-line-subtle'
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  )
}
