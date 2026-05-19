import { useEffect, useState } from 'react'
import {
  getConfirmState,
  resolveConfirm,
  subscribeConfirm,
} from '../lib/confirm'

export function ConfirmDialog() {
  const [state, setState] = useState(getConfirmState)

  useEffect(() => subscribeConfirm(() => setState(getConfirmState())), [])

  useEffect(() => {
    if (!state.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolveConfirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.open])

  if (!state.open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onClick={() => resolveConfirm(false)}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-title font-semibold text-fg">
          {state.title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-body text-fg-dim">
          {state.message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1.5 text-ui text-fg-dim hover:bg-white/[0.05]"
            onClick={() => resolveConfirm(false)}
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-ui font-medium ${
              state.destructive
                ? 'bg-red-600/90 text-white hover:bg-red-600'
                : 'bg-accent text-accent-fg hover:brightness-110'
            }`}
            onClick={() => resolveConfirm(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
