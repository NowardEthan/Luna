import type { LunaPipelineTrace } from '../../types/lunaPipelineTrace'
import { LunaPipelineActivityBody } from './LunaPipelineActivityBody'
import { useTranslation } from 'react-i18next'

type Props = {
  trace: LunaPipelineTrace
}

/** Badges PAIA (análise, política, memória) — colapsados por defeito quando há narrativa. */
export function LunaPipelineTechnicalDetails({ trace }: Props) {
  const { t } = useTranslation()

  return (
    <details className="group/tech rounded-lg border border-line-subtle/60 bg-canvas/30">
      <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 px-2 py-1.5 text-[10px] text-fg-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
        <span
          className="shrink-0 transition-transform duration-200 group-open/tech:rotate-90"
          aria-hidden
        >
          ▸
        </span>
        <span className="font-medium">{t('chatTurn.luna_technical_details')}</span>
      </summary>
      <div className="border-t border-line-subtle/50 px-2 py-2">
        <LunaPipelineActivityBody trace={trace} />
      </div>
    </details>
  )
}
