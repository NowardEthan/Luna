import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

export type HistoryMenuItem = {
  id: string
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

type Props = {
  items: HistoryMenuItem[]
  ariaLabel: string
  className?: string
  /** Classes extra no botão (ex. `folderTreeControlClass` em pastas vívidas). */
  triggerClassName?: string
  align?: 'start' | 'end'
}

const MENU_GAP = 4
const MENU_MAX_HEIGHT = 280

export function HistoryOverflowMenu({
  items,
  ariaLabel,
  className = '',
  triggerClassName = '',
  align = 'end',
}: Props) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(() => setOpen(false), [])

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? MENU_MAX_HEIGHT
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp =
      spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow

    const top = openUp
      ? Math.max(MENU_GAP, rect.top - menuHeight - MENU_GAP)
      : rect.bottom + MENU_GAP

    setMenuStyle({
      position: 'fixed',
      top,
      left: align === 'end' ? undefined : rect.left,
      right:
        align === 'end' ? Math.max(MENU_GAP, window.innerWidth - rect.right) : undefined,
      minWidth: '10.5rem',
      maxHeight: MENU_MAX_HEIGHT,
      zIndex: 10100,
    })
  }, [align])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, items.length, updateMenuPosition])

  useEffect(() => {
    if (!open) return
    const onReposition = () => updateMenuPosition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const menu =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        style={menuStyle}
        className="luna-select-menu overflow-y-auto"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              close()
              item.onClick()
            }}
            className={`block w-full px-2.5 py-1.5 text-left text-[11px] transition-colors disabled:opacity-40 ${
              item.destructive
                ? 'text-danger hover:bg-danger-muted'
                : 'text-fg hover:bg-raised-hover'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    ) : null

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`luna-btn-ghost flex size-7 items-center justify-center p-0 opacity-70 hover:opacity-100 active:scale-95 ${triggerClassName}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
