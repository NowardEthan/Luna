type IconProps = {
  size?: number
  className?: string
}

const defaults = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Contorno clássico de nuvem. */
export function CloudOutlineIcon({ size = 15, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className={className}
      {...defaults}
    >
      <path d="M17.5 19H9a5 5 0 1 1 1.17-9.88 4 4 0 1 1 7.33-2.12A4.5 4.5 0 0 1 17.5 19Z" />
    </svg>
  )
}

/** Nuvem + seta para cima (enviar). */
export function CloudUploadIcon({ size = 15, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className={className}
      {...defaults}
    >
      <path d="M17.5 18H9a4.5 4.5 0 1 1 1.1-8.9 4 4 0 1 1 7.4-1.6A4 4 0 0 1 17.5 18Z" />
      <path d="M12 15V9M9.5 11.5 12 9l2.5 2.5" />
    </svg>
  )
}

/** Nuvem com visto (sincronizado). */
export function CloudDoneIcon({ size = 15, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className={className}
      {...defaults}
      strokeWidth={1.85}
    >
      <path d="M17.5 18H9a4.5 4.5 0 1 1 1.1-8.9 4 4 0 1 1 7.4-1.6A4 4 0 0 1 17.5 18Z" />
      <path d="M9.5 14.5 11 16l3.5-4" />
    </svg>
  )
}

/** Nuvem com alerta. */
export function CloudErrorIcon({ size = 15, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className={className}
      {...defaults}
      strokeWidth={1.85}
    >
      <path d="M17.5 18H9a4.5 4.5 0 1 1 1.1-8.9 4 4 0 1 1 7.4-1.6A4 4 0 0 1 17.5 18Z" />
      <path d="M12 13v2M12 10h.01" />
    </svg>
  )
}
