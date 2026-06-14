import { themeRegistry } from '../../../core/registry/ThemeRegistry'
import {
  cssVarsForTheme,
  LUNA_THEME_LIST,
  writeStoredThemeId,
} from '../../../lib/lunaThemes'
import type { PreferencesSharedProps } from '../settingsSections'
import { useTranslation } from 'react-i18next'

export function AppearanceSection({
  themeId,
  onThemeChange,
  disabled,
}: PreferencesSharedProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_appearance_label', 'Aparência')}</h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t('settings.appearance_hint', 'Tema visual da interface. A escolha fica guardada neste dispositivo.')}
        </p>
      </header>
      
      <div className="luna-card">
        <div
          className="grid max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="radiogroup"
          aria-label={t('settings.theme_aria', 'Tema')}
        >
        {LUNA_THEME_LIST.map((opt) => {
          const active = themeId === opt.id
          const preview = cssVarsForTheme(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => {
                if (active) return
                writeStoredThemeId(opt.id)
                themeRegistry.setActive(opt.id)
                onThemeChange(opt.id)
              }}
              className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 disabled:opacity-40 ${
                active
                  ? 'border-accent shadow-sm ring-2 ring-accent/50'
                  : 'border-line hover:-translate-y-1 hover:border-line-subtle hover:bg-raised-hover hover:shadow-md'
              }`}
            >
              {active && (
                <div className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div
                className="relative flex h-16 items-end gap-1.5 border-b border-line-subtle p-3"
                style={{
                  background: preview['--color-canvas'],
                }}
              >
                <div
                  className="h-8 w-8 rounded-sm border"
                  style={{
                    background: preview['--color-sidebar'],
                    borderColor: preview['--color-line'],
                  }}
                />
                <div
                  className="h-8 min-w-0 flex-1 rounded-sm border"
                  style={{
                    background: preview['--color-surface'],
                    borderColor: preview['--color-line'],
                  }}
                />
                <div
                  className="mb-0.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: preview['--color-accent'] }}
                  title={t('settings.accent_color')}
                />
              </div>
              <div className="px-3 py-2.5">
                <span className="text-ui font-medium text-fg">{opt.label}</span>
                <p className="mt-0.5 text-[10px] leading-snug text-fg-muted">
                  {opt.hint}
                </p>
              </div>
            </button>
          )
        })}
        </div>
      </div>
    </div>
  )
}
