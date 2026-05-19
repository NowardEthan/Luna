import { createElement, type ReactNode } from 'react'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return createElement(
    'div',
    {
      className:
        'flex flex-col items-center justify-center gap-2 px-4 py-8 text-center',
    },
    createElement('p', { className: 'text-body font-medium text-fg' }, title),
    description
      ? createElement(
          'p',
          { className: 'max-w-xs text-ui text-fg-muted' },
          description,
        )
      : null,
    action ?? null,
  )
}
