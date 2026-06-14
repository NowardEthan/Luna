import type { LunaWorkbenchMode } from '../../lib/workbenchMode'
import { usePreferencesNav } from './hooks/usePreferencesNav'
import { SettingsNav } from './SettingsNav'
import {
  PREFERENCES_SECTION_COMPONENTS,
  PREFERENCES_SECTIONS,
  type PreferencesSharedProps,
} from './settingsSections'
import { useTranslation } from 'react-i18next'

type Props = PreferencesSharedProps & {
  onClose: () => void
  workbenchMode?: LunaWorkbenchMode
}

export function PreferencesView(props: Props) {
  const { t } = useTranslation()
  const { onClose, workbenchMode = 'chat', ...shared } = props
  const backLabel =
    workbenchMode === 'ide' ? t('settings.back_to_ide') : t('settings.back_to_chat')
  const { section, setSection } = usePreferencesNav()
  const Section = PREFERENCES_SECTION_COMPONENTS[section]
  const fullHeightSection = section === 'addons'

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas relative">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          className="luna-btn-secondary px-3 py-1.5 shadow-sm"
          onClick={onClose}
        >
          {backLabel}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SettingsNav
          sections={PREFERENCES_SECTIONS}
          active={section}
          onSelect={setSection}
        />
        <main
          className={`min-h-0 flex-1 overflow-y-auto p-6 bg-canvas/30 ${
            fullHeightSection ? 'flex flex-col' : ''
          }`}
        >
          <div
            className={
              fullHeightSection
                ? 'flex min-h-0 flex-1 flex-col'
                : 'mx-auto max-w-3xl'
            }
          >
            <Section {...shared} onNavigateSection={setSection} />
          </div>
        </main>
      </div>
    </div>
  )
}
