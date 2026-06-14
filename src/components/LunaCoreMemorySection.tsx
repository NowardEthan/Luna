import { useLunaCoreMemory } from '../hooks/useLunaCoreMemory'

type Props = {
  open: boolean
}

export function LunaCoreMemorySection({ open }: Props) {
  const { fatos, loading, error } = useLunaCoreMemory(open)

  if (!open) return null

  return (
    <section className="mb-4 border-b border-line pb-4">
      <h3 className="mb-1 text-ui font-medium text-fg">Memória Luna Core</h3>
      <p className="mb-3 text-caption text-fg-muted">
        Fatos consolidados no SQLite do motor (reflexão pós-conversa e neurônio de memória).
      </p>
      {loading ? (
        <p className="text-caption text-fg-muted">A carregar…</p>
      ) : error ? (
        <p className="text-caption text-amber-400/90">
          {error}
          {error.includes('NODE_MODULE') || error.includes('better-sqlite3')
            ? ' — execute `npm run luna-core:rebuild-electron`.'
            : null}
        </p>
      ) : fatos.length === 0 ? (
        <p className="text-caption text-fg-muted">
          Nenhum fato de longo prazo ainda. Apague uma conversa com conteúdo ou peça à Luna para
          lembrar algo explicitamente.
        </p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
          {fatos.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-line bg-raised/40 px-3 py-2 text-caption text-fg-dim"
            >
              <p className="text-fg">{f.conteudo}</p>
              <p className="mt-1 text-[10px] text-fg-muted">
                {f.tipo} · {f.escopo}
                {f.saliencia_score != null
                  ? ` · saliência ${(f.saliencia_score * 100).toFixed(0)}%`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
