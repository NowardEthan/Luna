import type { LunaWorkbenchMode } from '../../lib/workbenchMode'
import { usePreferencesNav } from './hooks/usePreferencesNav'
import { SettingsNav } from './SettingsNav'
import {
  PREFERENCES_SECTION_COMPONENTS,
  PREFERENCES_SECTIONS,
  type PreferencesSharedProps,
} from './settingsSections'

type Props = PreferencesSharedProps & {
  onClose: () => void
  workbenchMode?: LunaWorkbenchMode
}

export function PreferencesView(props: Props) {
  const { onClose, workbenchMode = 'chat', ...shared } = props
  const backLabel =
    workbenchMode === 'ide' ? 'Voltar ao IDE' : 'Voltar à conversa'
  const { section, setSection } = usePreferencesNav()
  const Section = PREFERENCES_SECTION_COMPONENTS[section]
  const meta = PREFERENCES_SECTIONS.find((s) => s.id === section)
  const fullHeightSection = section === 'addons'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
        <div>
          <h1 className="text-title font-semibold text-fg">Definições</h1>
          {meta ? (
            <p className="text-ui text-fg-muted">{meta.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="luna-btn-secondary px-3 py-1.5"
          onClick={onClose}
        >
          {backLabel}
        </button>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SettingsNav
          sections={PREFERENCES_SECTIONS}
          active={section}
          onSelect={setSection}
        />
        <main
          className={`min-h-0 flex-1 overflow-y-auto p-5 ${
            fullHeightSection ? 'flex flex-col' : ''
          }`}
        >
          <div
            className={
              fullHeightSection
                ? 'flex min-h-0 flex-1 flex-col'
                : 'mx-auto max-w-2xl'
            }
          >
            <Section {...shared} onNavigateSection={setSection} />
          </div>
        </main>
      </div>
    </div>
  )
}
