import type { CSSProperties, ReactNode } from 'react'

export type StackProps = {
  children: ReactNode
  direction?: 'row' | 'column'
  gap?: number
  className?: string
  style?: CSSProperties
}

export function Stack({
  children,
  direction = 'column',
  gap = 8,
  className = '',
  style,
}: StackProps) {
  const Tag = 'div' as const
  return (
    <Tag
      className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'} ${className}`}
      style={{ gap: `${gap}px`, ...style }}
    >
      {children}
    </Tag>
  )
}
