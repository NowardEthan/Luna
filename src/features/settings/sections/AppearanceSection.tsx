import { themeRegistry } from '../../../core/registry/ThemeRegistry'
import {
  cssVarsForTheme,
  LUNA_THEME_LIST,
  writeStoredThemeId,
} from '../../../lib/lunaThemes'
import type { PreferencesSharedProps } from '../settingsSections'

export function AppearanceSection({
  themeId,
  onThemeChange,
  disabled,
}: PreferencesSharedProps) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title font-semibold text-fg">Aparência</h2>
        <p className="mt-1 text-ui text-fg-muted">
          Tema visual da interface. A escolha fica guardada neste dispositivo.
        </p>
      </header>
      <div
        className="grid max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="radiogroup"
        aria-label="Tema"
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
              className={`flex flex-col overflow-hidden rounded-lg border text-left transition-colors disabled:opacity-40 ${
                active
                  ? 'border-accent/50 ring-1 ring-accent/30'
                  : 'border-line hover:border-line-subtle hover:bg-white/[0.03]'
              }`}
            >
              <div
                className="flex h-14 items-end gap-1 border-b border-line-subtle p-2"
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
                  title="Cor de destaque"
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
  )
}
