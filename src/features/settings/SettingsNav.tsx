import type { PreferencesSectionDef, PreferencesSectionId } from './settingsSections'
import { lunaNavItemClass } from '../../lib/lunaVisual'
import { useTranslation } from 'react-i18next'

type Props = {
  sections: PreferencesSectionDef[]
  active: PreferencesSectionId
  onSelect: (id: PreferencesSectionId) => void
}

const Icons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  conversation: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  llm: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9.5 12h5"/><path d="M12 9.5v5"/></svg>,
  appearance: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  documents: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M3 15h6"/><path d="M3 18h6"/></svg>,
  memory: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  addons: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  mcp: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  cloud: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
}

export function SettingsNav({ sections, active, onSelect }: Props) {
  const { t } = useTranslation()
  return (
    <nav
      className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-canvas/50 p-3 shadow-inner"
      aria-label={t('settings.nav_aria', 'Categorias de definições')}
    >
      {sections.map((s) => {
        const selected = s.id === active
        const Icon = Icons[s.id]
        return (
          <button
            key={s.id}
            type="button"
            className={`group w-full ${lunaNavItemClass(selected)}`}
            aria-current={selected ? 'page' : undefined}
            onClick={() => onSelect(s.id)}
          >
            {Icon && (
              <Icon className={`h-4 w-4 shrink-0 transition-transform ${selected ? 'scale-110' : 'group-hover:scale-110'}`} />
            )}
            <div>
              <span className="block text-ui font-medium leading-none">{t(`settings.section_${s.id}_label`)}</span>
              {!selected ? (
                <span className="mt-1 block text-[10px] leading-snug opacity-70">
                  {t(`settings.section_${s.id}_desc`)}
                </span>
              ) : null}
            </div>
          </button>
        )
      })}
    </nav>
  )
}
