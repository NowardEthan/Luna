import type { LunaModelOption } from '../lib/llmModelSelection'
import { Select } from './ui/Select'

type Props = {
  models: LunaModelOption[]
  selectedId: string | null
  onChange: (id: string) => void
  disabled?: boolean
  loading?: boolean
  error?: string | null
}

export function ModelSelector({
  models,
  selectedId,
  onChange,
  disabled = false,
  loading = false,
  error = null,
}: Props) {
  const busy = disabled || loading

  const options =
    loading
      ? [{ value: '', label: 'A carregar modelos…' }]
      : models.length === 0
        ? [{ value: '', label: 'Sem modelos' }]
        : models.map((m) => ({ value: m.id, label: m.label }))

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Select
        id="luna-model-select"
        label="Modelo LLM"
        value={selectedId ?? ''}
        onChange={onChange}
        options={options}
        disabled={busy || models.length === 0}
        placeholder="Modelo"
        title={
          error
            ? error
            : 'Modelo e provedor para esta conversa (definidos no .env)'
        }
        variant="default"
        size="md"
        className="max-w-[min(100%,15rem)]"
        align="end"
      />
      {error ? (
        <p className="truncate text-[9px] text-red-400/90" title={error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
