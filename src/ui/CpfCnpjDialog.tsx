import { useEffect, useRef, useState } from 'react'
import {
  getCpfCnpjPromptState,
  resolveCpfCnpjPrompt,
  submitCpfCnpjPrompt,
  subscribeCpfCnpjPrompt,
} from '../lib/cpfCnpjPrompt'

const inputClass =
  'w-full rounded-lg border border-line-subtle bg-canvas px-3 py-2 text-[13px] text-fg outline-none transition focus:border-accent'

export function CpfCnpjDialog() {
  const [state, setState] = useState(getCpfCnpjPromptState)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => subscribeCpfCnpjPrompt(() => setState(getCpfCnpjPromptState())), [])

  useEffect(() => {
    if (!state.open) {
      setValue('')
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [state.open])

  useEffect(() => {
    if (!state.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolveCpfCnpjPrompt(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.open])

  if (!state.open) return null

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => resolveCpfCnpjPrompt(null)}
    >
      <div
        role="dialog"
        aria-labelledby="cpfcnpj-title"
        aria-describedby="cpfcnpj-desc"
        aria-modal="true"
        className="luna-dialog w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cpfcnpj-title" className="text-title font-semibold text-fg">
          CPF ou CNPJ
        </h2>
        <p id="cpfcnpj-desc" className="mt-2 text-body text-fg-dim">
          O Asaas exige CPF ou CNPJ para criar a cobrança. Usamos apenas para faturamento.
        </p>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            submitCpfCnpjPrompt(value)
          }}
        >
          <label htmlFor="cpfcnpj-input" className="sr-only">
            CPF ou CNPJ
          </label>
          <input
            ref={inputRef}
            id="cpfcnpj-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {state.error ? (
            <p className="mt-2 text-[12px] text-danger" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="luna-btn-secondary !px-3 !py-1.5"
              onClick={() => resolveCpfCnpjPrompt(null)}
            >
              Cancelar
            </button>
            <button type="submit" className="luna-btn-primary !px-3 !py-1.5">
              Continuar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
