import { useEffect, useState } from 'react'
import { getToasts, subscribeToasts, type ToastItem } from '../lib/toast'

function ToastItemView({ item }: { item: ToastItem }) {
  const border =
    item.kind === 'error'
      ? 'border-red-400/40'
      : item.kind === 'success'
        ? 'border-emerald-400/35'
        : 'border-line'
  return (
    <div
      role="status"
      className={`animate-chat-message-in rounded-lg border ${border} bg-surface px-3 py-2 text-ui text-fg shadow-lg`}
    >
      {item.message}
    </div>
  )
}

export function ToastHost() {
  const [items, setItems] = useState(getToasts)

  useEffect(() => subscribeToasts(() => setItems(getToasts())), [])

  if (!items.length) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {items.map((t) => (
        <ToastItemView key={t.id} item={t} />
      ))}
    </div>
  )
}
