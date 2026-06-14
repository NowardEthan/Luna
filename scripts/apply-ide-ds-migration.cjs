const fs = require('fs')

function patch(file, reps) {
  let t = fs.readFileSync(file, 'utf8')
  for (const [from, to] of reps) {
    if (from instanceof RegExp) t = t.replace(from, to)
    else if (!t.includes(from)) console.warn('miss', file, from.slice(0, 40))
    else t = t.split(from).join(to)
  }
  fs.writeFileSync(file, t, 'utf8')
}

patch('src/components/ide/PendingChangesPanel.tsx', [
  [
    "? 'border-b border-line bg-canvas/95 px-2 py-2 backdrop-blur-sm'",
    "? 'border-b border-line bg-canvas px-2 py-2'",
  ],
  [
    "? 'shrink-0 border-t border-line bg-sidebar/90 px-2 py-2'",
    "? 'shrink-0 border-t border-line bg-sidebar px-2 py-2'",
  ],
  [
    'rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-2.5 py-2',
    'luna-callout-warning px-2.5 py-2',
  ],
  [
    'rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg transition-opacity hover:brightness-110 disabled:opacity-45',
    'luna-btn-primary px-2.5 py-1 text-[11px] disabled:opacity-45',
  ],
  [
    'rounded-md border border-line px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:bg-white/[0.06] disabled:opacity-45',
    'luna-btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-45',
  ],
  [
    'rounded-lg border border-orange-500/30 bg-orange-500/[0.07] px-2.5 py-2',
    'luna-callout-warning px-2.5 py-2',
  ],
  [
    'rounded-md bg-orange-500/80 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-orange-500 disabled:opacity-45',
    'luna-btn-warning px-2.5 py-1 text-[11px] disabled:opacity-45',
  ],
])

patch('src/components/ide/FileExplorer.tsx', [
  [
    'rounded px-1.5 py-0.5 text-[10px] text-accent hover:bg-white/[0.06]',
    'luna-btn-ghost px-1.5 py-0.5 text-[10px] text-accent',
  ],
  [
    'className={`flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left hover:bg-white/[0.05] ${\n          active ? \'bg-white/[0.08] text-fg\' : \'text-fg-dim\'\n        }`}',
    'className={`luna-hover-row flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left ${\n          active ? \'bg-surface text-fg ring-1 ring-accent/25\' : \'text-fg-dim\'\n        }`}',
  ],
  ['text-amber-400', 'text-warning'],
  [
    'className="flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left text-fg-dim hover:bg-white/[0.05]"',
    'className="luna-hover-row flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left text-fg-dim"',
  ],
])

patch('src/components/ide/EditorPanel.tsx', [
  [
    "import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'",
    "import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'\nimport { lunaTabClass } from '../../lib/lunaVisual'",
  ],
  [
    /className=\{`group flex max-w-\[180px\][\s\S]*?`\}/,
    'className={`group flex max-w-[180px] shrink-0 items-center gap-1 text-[11px] ${lunaTabClass(isActive)}`}',
  ],
])

patch('src/ui/Select.tsx', [
  [
    /const triggerVariant: Record<NonNullable<Props\['variant'\]>, string> = \{[\s\S]*?\}\n\nconst triggerSize/,
    `const triggerVariant: Record<NonNullable<Props['variant']>, string> = {
  default: 'luna-btn-secondary',
  toolbar: 'luna-btn-ghost border-transparent shadow-none',
  ghost: 'luna-btn-ghost border-transparent shadow-none px-2',
}

const triggerSize`,
  ],
])

console.log('IDE DS migration applied')
