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
      className="luna-overlay-scrim fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => resolveConfirm(false)}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="luna-dialog w-full max-w-md p-4"
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
            className="luna-btn-secondary !px-3 !py-1.5"
            onClick={() => resolveConfirm(false)}
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            className={
              state.destructive
                ? 'luna-btn-primary !bg-danger !px-3 !py-1.5 !text-canvas !shadow-danger/30 hover:!bg-danger/90'
                : 'luna-btn-primary !px-3 !py-1.5'
            }
            onClick={() => resolveConfirm(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
