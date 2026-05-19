import { useCallback, useEffect, useState } from 'react'
import type {
  PluginSettingField,
  PluginSettingsSchema,
} from '../../../packages/luna-sdk/src'
import {
  patchPluginSettings,
  readPluginSettings,
} from '../../core/plugin/pluginSettingsStorage'

type Props = {
  pluginId: string
  schema: PluginSettingsSchema
  disabled?: boolean
  onChange?: () => void
}

function fieldValue(
  values: Record<string, unknown>,
  field: PluginSettingField,
): unknown {
  if (values[field.key] !== undefined) return values[field.key]
  return field.default
}

export function AddonSchemaForm({
  pluginId,
  schema,
  disabled,
  onChange,
}: Props) {
  const [values, setValues] = useState(() => readPluginSettings(pluginId))

  useEffect(() => {
    setValues(readPluginSettings(pluginId))
  }, [pluginId])

  const update = useCallback(
    (key: string, value: unknown) => {
      const next = patchPluginSettings(pluginId, { [key]: value })
      setValues(next)
      onChange?.()
    },
    [pluginId, onChange],
  )

  if (!schema.fields.length) return null

  return (
    <div className="space-y-3">
      <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">
        Propriedades
      </p>
      {schema.fields.map((field) => {
        const val = fieldValue(values, field)
        return (
          <label
            key={field.key}
            className="block rounded-lg border border-line px-3 py-2"
          >
            <span className="text-ui font-medium text-fg">{field.label}</span>
            {field.description ? (
              <span className="mt-0.5 block text-[10px] text-fg-muted">
                {field.description}
              </span>
            ) : null}
            <div className="mt-2">
              {field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(val)}
                  onChange={(e) => update(field.key, e.target.checked)}
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  disabled={disabled}
                  value={typeof val === 'number' ? val : Number(field.default ?? 0)}
                  onChange={(e) =>
                    update(field.key, Number(e.target.value))
                  }
                  className="w-full rounded border border-line bg-raised px-2 py-1 text-ui text-fg"
                />
              ) : field.type === 'select' ? (
                <select
                  disabled={disabled}
                  value={String(val ?? field.default ?? '')}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="w-full rounded border border-line bg-raised px-2 py-1 text-ui text-fg"
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled={disabled}
                  value={String(val ?? field.default ?? '')}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="w-full rounded border border-line bg-raised px-2 py-1 text-ui text-fg"
                />
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}

