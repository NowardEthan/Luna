import type { PreferencesSectionDef, PreferencesSectionId } from './settingsSections'

type Props = {
  sections: PreferencesSectionDef[]
  active: PreferencesSectionId
  onSelect: (id: PreferencesSectionId) => void
}

export function SettingsNav({ sections, active, onSelect }: Props) {
  return (
    <nav
      className="flex w-[200px] shrink-0 flex-col gap-0.5 border-r border-line bg-sidebar/80 py-3 pr-2"
      aria-label="Categorias de definições"
    >
      {sections.map((s) => {
        const selected = s.id === active
        return (
          <button
            key={s.id}
            type="button"
            className={`rounded-r-lg px-3 py-2 text-left transition-colors ${
              selected
                ? 'bg-accent-muted text-accent'
                : 'text-fg-dim hover:bg-white/[0.05] hover:text-fg'
            }`}
            aria-current={selected ? 'page' : undefined}
            onClick={() => onSelect(s.id)}
          >
            <span className="block text-ui font-medium">{s.label}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-fg-muted">
              {s.description}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
