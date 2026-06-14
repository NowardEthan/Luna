import type { ReactNode } from 'react'
import type { LunaPipelineTrace } from '../../types/lunaPipelineTrace'
import {
  labelComplexidade,
  labelIntencao,
  labelMemoriaAcao,
  labelMemoriaTipo,
  labelPoliticaAcao,
  labelRisco,
  labelTom,
} from '../../lib/lunaPipelineLabels'
import { useTranslation } from 'react-i18next'

type Props = {
  trace: LunaPipelineTrace
}

function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ok' | 'muted' }) {
  const cls =
    tone === 'accent'
      ? 'bg-accent/12 text-accent ring-accent/25'
      : tone === 'ok'
        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
        : tone === 'muted'
          ? 'bg-line-subtle/60 text-fg-muted ring-line-subtle'
          : 'bg-raised/80 text-fg-dim ring-line-subtle/80'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  )
}

function StepBlock({
  dotClass,
  title,
  children,
}: {
  dotClass: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-line-subtle/80 bg-canvas/50 px-2.5 py-2">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-muted/80">
          {title}
        </p>
        <div className="flex flex-wrap gap-1.5">{children}</div>
      </div>
    </div>
  )
}

export function LunaPipelineActivityBody({ trace }: Props) {
  const { t } = useTranslation()

  const riscoTone =
    trace.nivelRisco === 'nenhum' || trace.nivelRisco === 'baixo'
      ? 'ok'
      : trace.nivelRisco === 'critico' || trace.nivelRisco === 'alto'
        ? 'accent'
        : 'neutral'

  return (
    <div className="flex flex-col gap-2">
      <StepBlock dotClass="bg-sky-400/90 shadow-[0_0_6px_rgba(56,189,248,0.45)]" title={t('chatTurn.luna_step_analise')}>
        <Chip tone="accent">{labelIntencao(trace.intencao)}</Chip>
        <Chip tone={riscoTone}>{labelRisco(trace.nivelRisco)}</Chip>
        {trace.complexidade ? (
          <Chip>{labelComplexidade(trace.complexidade)}</Chip>
        ) : null}
      </StepBlock>

      <StepBlock dotClass="bg-violet-400/90 shadow-[0_0_6px_rgba(167,139,250,0.4)]" title={t('chatTurn.luna_step_politica')}>
        <Chip tone="accent">{labelPoliticaAcao(trace.politicaAcao)}</Chip>
        <Chip>{labelTom(trace.politicaTom)}</Chip>
        {trace.politicaModo ? <Chip tone="muted">{trace.politicaModo.replace(/_/g, ' ')}</Chip> : null}
      </StepBlock>

      <StepBlock dotClass="bg-emerald-400/85 shadow-[0_0_6px_rgba(52,211,153,0.35)]" title={t('chatTurn.luna_step_memoria')}>
        <Chip tone={trace.memoriaAcao === 'armazenar' ? 'ok' : 'muted'}>
          {labelMemoriaAcao(trace.memoriaAcao)}
        </Chip>
        {trace.memoriaTipo ? <Chip>{labelMemoriaTipo(trace.memoriaTipo)}</Chip> : null}
      </StepBlock>

      {trace.memoriaMotivo?.trim() ? (
        <p className="px-0.5 text-[10px] leading-snug text-fg-muted">
          <span className="font-medium text-fg-dim">{t('chatTurn.luna_memoria_motivo')}:</span>{' '}
          {trace.memoriaMotivo}
        </p>
      ) : null}
    </div>
  )
}
