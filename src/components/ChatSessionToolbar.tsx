import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { PersonalityControls } from './PersonalityControls'
import { LocaleSelect } from './translation/LocaleSelect'
import { readAutoTranslateEnabled } from '../translation'
import type { ChatPersonalityId } from '../lib/chatPersonality'
import { isInsideLunaFloatingOverlay } from '../lib/floatingOverlay'
import { useTranslation } from 'react-i18next'

type Props = {
  personalityId: ChatPersonalityId
  onPersonalityChange: (id: ChatPersonalityId) => void
  onNewConversation: () => void
  onExportConversation?: () => void
  disabled?: boolean
}

const PANEL_WIDTH = 288
const PANEL_GAP = 6
// Mantido abaixo de 9999 (z-index do Select dropdown portado) para que
// os dropdowns internos apareçam acima do painel e não atrás dele.
const PANEL_Z = 9001

function ConversationPrefsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M2 14h4M10 8h4M18 16h4" />
    </svg>
  )
}

function PreferenceMenu({
  personalityId,
  onPersonalityChange,
  onExportConversation,
  disabled,
  onClose,
}: Pick<
  Props,
  'personalityId' | 'onPersonalityChange' | 'onExportConversation' | 'disabled'
> & { onClose: () => void }) {
  const showLocale = readAutoTranslateEnabled()
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col gap-3"
      role="menu"
      aria-label={t('toolbar.conversation_prefs_aria')}
    >
      <fieldset className="m-0 space-y-1.5 border-0 p-0" disabled={disabled}>
        <legend className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
          {t('toolbar.tone')}
        </legend>
        <PersonalityControls
          value={personalityId}
          onChange={onPersonalityChange}
          disabled={disabled}
          variant="menu"
        />
      </fieldset>

      {showLocale ? (
        <fieldset className="m-0 space-y-1.5 border-0 p-0" disabled={disabled}>
          <legend className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
            {t('toolbar.language')}
          </legend>
          <LocaleSelect disabled={disabled} fullWidth />
        </fieldset>
      ) : null}

      {onExportConversation ? (
        <>
          {showLocale ? (
            <div className="border-t border-line" role="separator" />
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            className="w-full rounded-lg px-2 py-2 text-left text-ui text-fg-dim transition-colors hover:bg-raised-hover hover:text-fg disabled:opacity-40"
            onClick={() => {
              onExportConversation()
              onClose()
            }}
          >
            {t('toolbar.export')}
          </button>
        </>
      ) : null}
    </div>
  )
}

export function ChatSessionToolbar({
  personalityId,
  onPersonalityChange,
  onExportConversation,
  disabled,
}: Props) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = panel?.offsetHeight ?? 240
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp =
      spaceBelow < panelHeight + PANEL_GAP + 8 &&
      rect.top > panelHeight + PANEL_GAP

    const top = openUp
      ? Math.max(PANEL_GAP, rect.top - panelHeight - PANEL_GAP)
      : rect.bottom + PANEL_GAP

    setPanelStyle({
      position: 'fixed',
      top,
      right: Math.max(8, window.innerWidth - rect.right),
      width,
      zIndex: PANEL_Z,
    })
  }, [])

  useLayoutEffect(() => {
    if (!menuOpen) return
    updatePanelPosition()
  }, [menuOpen, updatePanelPosition, personalityId])

  useEffect(() => {
    if (!menuOpen) return
    const onReposition = () => updatePanelPosition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [menuOpen, updatePanelPosition])

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        isInsideLunaFloatingOverlay(target)
      ) {
        return
      }
      setMenuOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const hasCustomPrefs = personalityId !== 'conversa'

  const menuPortal =
    menuOpen && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="luna-overlay-scrim fixed inset-0 z-[9000] cursor-default"
              aria-label={t('toolbar.close_prefs_aria')}
              onClick={() => setMenuOpen(false)}
            />
            <div
              ref={panelRef}
              style={panelStyle}
              className="luna-dialog max-h-[min(80vh,24rem)] overflow-y-auto p-3"
              role="dialog"
              aria-modal="true"
              aria-label={t('toolbar.prefs_dialog_aria')}
            >
              <PreferenceMenu
                personalityId={personalityId}
                onPersonalityChange={onPersonalityChange}
                onExportConversation={onExportConversation}
                disabled={disabled}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      role="toolbar"
      aria-label={t('toolbar.actions_aria')}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        onClick={() => setMenuOpen((o) => !o)}
        className={`luna-btn-secondary inline-flex items-center gap-1.5 ${
          menuOpen ? 'border-line bg-raised-hover text-fg' : ''
        }`}
        title={t('toolbar.settings_title')}
      >
        <ConversationPrefsIcon className="opacity-80" />
        <span className="hidden sm:inline">{t('toolbar.settings')}</span>
        {hasCustomPrefs ? (
          <span
            className="size-1.5 shrink-0 rounded-full bg-accent"
            aria-label={t('toolbar.custom_tone_aria')}
          />
        ) : null}
      </button>

      {menuPortal}
    </div>
  )
}
