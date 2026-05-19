export type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-raised ${className}`}
    />
  )
}
