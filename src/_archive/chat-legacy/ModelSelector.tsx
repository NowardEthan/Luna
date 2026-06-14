import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const busy = disabled || loading

  const options = useMemo(() => {
    if (loading) return [{ value: '', label: t('modelSelector.loading') }]
    if (models.length === 0) return [{ value: '', label: t('modelSelector.empty') }]
    return models.map((m) => ({ value: m.id, label: m.label }))
  }, [loading, models, t])

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Select
        id="luna-model-select"
        label={t('modelSelector.label')}
        value={selectedId ?? ''}
        onChange={onChange}
        options={options}
        disabled={busy || models.length === 0}
        placeholder={t('modelSelector.placeholder')}
        title={error ?? t('modelSelector.title')}
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
