import type { ChatFolder, FolderColorId, FolderIconId } from '../../types/chat'
import i18n from '../../i18n'
import {
  lunaHasVividTone,
  lunaToneIconChipClass,
  lunaToneSectionClass,
  lunaVividBorderLeftClass,
  lunaVividControlClass,
  lunaVividDotClass,
  lunaVividIconChipClass,
  lunaVividShellClass,
  lunaVividTone,
  type LunaVividTone,
} from '../../lib/lunaVisual'

export const FOLDER_ICON_OPTIONS: FolderIconId[] = [
  'folder',
  'star',
  'heart',
  'home',
  'user',
  'users',
  'briefcase',
  'code',
  'book',
  'graduation',
  'lightbulb',
  'rocket',
  'tag',
  'bookmark',
  'calendar',
  'clock',
  'mail',
  'inbox',
  'chat',
  'bell',
  'globe',
  'map',
  'sun',
  'moon',
  'cloud',
  'zap',
  'flame',
  'coffee',
  'cart',
  'music',
  'camera',
  'image',
  'gamepad',
  'palette',
  'wrench',
  'shield',
  'archive',
]

export const FOLDER_COLOR_OPTIONS: FolderColorId[] = [
  'default',
  'blue',
  'green',
  'amber',
  'rose',
  'violet',
  'cyan',
]

const COLOR_CLASS: Record<FolderColorId, string> = {
  default: 'text-fg-dim',
  blue: 'text-sky-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  violet: 'text-violet-600',
  cyan: 'text-cyan-600',
}

const COLOR_DOT: Record<FolderColorId, string> = {
  default: lunaVividDotClass('default'),
  blue: lunaVividDotClass('blue'),
  green: lunaVividDotClass('green'),
  amber: lunaVividDotClass('amber'),
  rose: lunaVividDotClass('rose'),
  violet: lunaVividDotClass('violet'),
  cyan: lunaVividDotClass('cyan'),
}

export function folderIconLabel(icon: FolderIconId): string {
  const key = `history.folderIcon.${icon}`
  return i18n.exists(key) ? i18n.t(key) : i18n.t('history.folderIcon.folder')
}

export function folderColorClass(color: FolderColorId | undefined): string {
  return COLOR_CLASS[color ?? 'default']
}

export function folderColorDotClass(color: FolderColorId | undefined): string {
  return COLOR_DOT[color ?? 'default']
}

function asVividTone(color: FolderColorId | undefined): LunaVividTone {
  return lunaVividTone(color as LunaVividTone | undefined)
}

export function folderColorBorderClass(color: FolderColorId | undefined): string {
  return lunaVividBorderLeftClass(asVividTone(color))
}

const COLOR_BG: Record<FolderColorId, string> = {
  default: 'bg-raised',
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
}

export function folderColorBgClass(color: FolderColorId | undefined): string {
  return COLOR_BG[color ?? 'default']
}

export function folderHasVividShell(color: FolderColorId | undefined): boolean {
  return lunaHasVividTone(asVividTone(color))
}

export function folderIconChipClass(
  color: FolderColorId | undefined,
  onVividShell = false,
): string {
  if (onVividShell) return lunaVividIconChipClass(asVividTone(color))
  return lunaToneIconChipClass(asVividTone(color))
}

export function folderTreeControlClass(
  color: FolderColorId | undefined,
  onVividShell = false,
): string {
  if (onVividShell) return lunaVividControlClass(asVividTone(color))
  return 'text-fg-muted hover:bg-raised-hover hover:text-fg'
}

export function folderTreeOnVividShell(
  color: FolderColorId | undefined,
  state: {
    dropActive?: boolean
    selected?: boolean
    highlighted?: boolean
  } = {},
): boolean {
  const accent = Boolean(state.dropActive || state.selected || state.highlighted)
  return accent && lunaHasVividTone(asVividTone(color))
}

export function folderTreeShellClass(
  color: FolderColorId | undefined,
  state: {
    dropActive?: boolean
    selected?: boolean
    highlighted?: boolean
  } = {},
): string {
  const accent = Boolean(state.dropActive || state.selected || state.highlighted)
  const tone = asVividTone(color)
  if (accent) return lunaVividShellClass(tone, true)
  return lunaToneSectionClass(tone)
}

type IconProps = { size?: number; className?: string }

export function FolderGlyph({
  icon = 'folder',
  size = 14,
  className = '',
}: IconProps & { icon?: FolderIconId }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    className: `stroke-current ${className}`,
    strokeWidth: 2,
    'aria-hidden': true as const,
  }

  switch (icon) {
    case 'star':
      return (
        <svg {...common}>
          <path
            d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6Z"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )
    case 'code':
      return (
        <svg {...common}>
          <path d="m16 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m8 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      )
    case 'lightbulb':
      return (
        <svg {...common}>
          <path d="M9 18h6" strokeLinecap="round" />
          <path d="M10 22h4" strokeLinecap="round" />
          <path
            d="M15.1 14A7 7 0 1 0 8.9 14c.6.7 1 1.5 1 2.4V18h4v-1.6c0-.9.4-1.7 1.1-2.4Z"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'rocket':
      return (
        <svg {...common}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2Z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 4 0 4 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-4 0-4" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path
            d="M20.6 10.6 13.4 3.4a2 2 0 0 0-2.8 0L3.4 10.6a2 2 0 0 0 0 2.8l7.2 7.2a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8Z"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8.5Z" strokeLinejoin="round" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" strokeLinecap="round" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9" r="2" />
          <path d="M3 19c1.2-2.5 3.2-3.8 6-3.8M15 19c.8-2 2.3-3 4-3" strokeLinecap="round" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" strokeLinecap="round" />
        </svg>
      )
    case 'music':
      return (
        <svg {...common}>
          <path d="M9 18V6l10-2v12" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="16" r="2" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8h4l2-2h4l2 2h4v10H4V8Z" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )
    case 'gamepad':
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="10" rx="3" />
          <path d="M9 12v4M7 14h4M15.5 13.5h.01M17.5 15.5h.01" strokeLinecap="round" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" strokeLinecap="round" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="m3 7 9 12 9-5" strokeLinejoin="round" />
        </svg>
      )
    case 'map':
      return (
        <svg {...common}>
          <path d="M9 4 4 6v14l5-2 5 2 5-2V6l-5-2-5 2Z" strokeLinejoin="round" />
          <path d="M9 4v14M14 6v14" strokeLinecap="round" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 10 10 0 0 0 20 14.5Z" strokeLinejoin="round" />
        </svg>
      )
    case 'cloud':
      return (
        <svg {...common}>
          <path d="M7 18h11a4 4 0 0 0 0-8 5 5 0 0 0-9.8-1.5A3.5 3.5 0 0 0 7 18Z" strokeLinejoin="round" />
        </svg>
      )
    case 'zap':
      return (
        <svg {...common}>
          <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" strokeLinejoin="round" />
        </svg>
      )
    case 'coffee':
      return (
        <svg {...common}>
          <path d="M6 8h10v5a4 4 0 0 1-4 4H8a2 2 0 0 1-2-2V8Z" />
          <path d="M16 10h2a2 2 0 0 1 0 4h-2M7 2v2M11 2v2M15 2v2" strokeLinecap="round" />
        </svg>
      )
    case 'cart':
      return (
        <svg {...common}>
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
          <path d="M3 5h2l2 11h10l2-7H7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'graduation':
      return (
        <svg {...common}>
          <path d="M3 9.5 12 4l9 5.5-9 5-9-5Z" strokeLinejoin="round" />
          <path d="M6 12.5V17c0 1 2.5 2 6 2s6-1 6-2v-4.5" strokeLinecap="round" />
        </svg>
      )
    case 'wrench':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-1.4-1.4 2.1-2.1Z" strokeLinejoin="round" />
        </svg>
      )
    case 'palette':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 8 12.5 2.5 2.5 0 0 1-3-1 2.5 2.5 0 0 1-3-1 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1-2.5-2.5Z" strokeLinejoin="round" />
          <circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="11" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'archive':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
          <path d="M10 12h4" strokeLinecap="round" />
        </svg>
      )
    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4V6Z" strokeLinejoin="round" />
          <path d="M4 14h4l1.5 2h5L16 14h4" strokeLinejoin="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" strokeLinejoin="round" />
        </svg>
      )
    case 'flame':
      return (
        <svg {...common}>
          <path d="M12 22c4-2.5 6-6 6-10a6 6 0 0 0-10-4c-1 3-3 4.5-5 7-1.5 2.5-1 5 1 7Z" strokeLinejoin="round" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M12 4a4 4 0 0 0-4 4v3l-2 3h12l-2-3V8a4 4 0 0 0-4-4Z" strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 18 3 20V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3Z" strokeLinejoin="round" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M7 4h10v16l-5-3-5 3V4Z" strokeLinejoin="round" />
        </svg>
      )
    case 'image':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
          <path d="m8 16 4-4 3 3 4-5 3 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path
            d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

type FolderIconSource = Pick<ChatFolder, 'icon' | 'customIcon'>

export function FolderIconView({
  folder,
  size = 14,
  fill = false,
  className = '',
}: IconProps & { folder: FolderIconSource; /** Preenche o contentor pai (ex. botão na árvore) */ fill?: boolean }) {
  if (folder.customIcon) {
    return (
      <img
        src={folder.customIcon}
        alt=""
        className={
          fill
            ? `size-full object-cover ${className}`
            : `rounded object-cover ${className}`
        }
        style={fill ? undefined : { width: size, height: size }}
        draggable={false}
      />
    )
  }
  return (
    <FolderGlyph icon={folder.icon ?? 'folder'} size={size} className={className} />
  )
}
