import {
  envMismatch,
  preferenceSetupHint,
  resolveEffectiveLlmMode,
  type LunaLlmRuntimePreference,
} from '../../../lib/lunaLlmRuntimeMode'
import { localModelLabel } from '../../../lib/lunaLocalLlmProfile'
import type { PreferencesSharedProps } from '../settingsSections'
import { useLocalLlmProfile } from '../hooks/useLlmRuntimePreference'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

const OPTIONS: Array<{
  id: LunaLlmRuntimePreference
  titleKey: string
  titleDefault: string
  descKey: string
  descDefault: string
}> = [
  {
    id: 'auto',
    titleKey: 'settings.llm_mode_auto_title',
    titleDefault: 'Automático (.env)',
    descKey: 'settings.llm_mode_auto_desc',
    descDefault: 'Usa o perfil aplicado com npm run luna-env:local ou luna-env:cloud.',
  },
  {
    id: 'local',
    titleKey: 'settings.llm_mode_local_title',
    titleDefault: 'Local',
    descKey: 'settings.llm_mode_local_desc',
    descDefault: 'LM Studio / Ollama neste PC — sem cota cloud, modelos teus.',
  },
  {
    id: 'cloud',
    titleKey: 'settings.llm_mode_cloud_title',
    titleDefault: 'Cloud',
    descKey: 'settings.llm_mode_cloud_desc',
    descDefault: 'Groq ou servidor remoto — consome cota da Conta Lunar (P3).',
  },
]

export function LlmRuntimeSection({ disabled }: PreferencesSharedProps) {
  const { t } = useTranslation()
  const {
    preference,
    setPreference,
    runtimeInfo,
    loading,
    refresh,
    profile,
    draft,
    updateDraft,
    models,
    discovering,
    discoverModels,
    testing,
    testConnection,
    testResult,
    saving,
    saveProfile,
    applyingEnv,
    applyToEnv,
    actionMessage,
  } = useLocalLlmProfile()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const detected = runtimeInfo?.ok ? runtimeInfo.detectedMode ?? 'cloud' : 'cloud'
  const effective = resolveEffectiveLlmMode(detected, preference)
  const mismatch = runtimeInfo?.ok ? envMismatch(detected, preference) : false
  const setupHint = preferenceSetupHint(preference)
  const showLocalConfig = preference === 'local' || effective === 'local'

  const modelOptions =
    models.length > 0
      ? models
      : [
          ...(draft.modeloMenor
            ? [{ id: draft.modeloMenor, label: draft.modeloMenor }]
            : []),
          ...(draft.modeloMaior && draft.modeloMaior !== draft.modeloMenor
            ? [{ id: draft.modeloMaior, label: draft.modeloMaior }]
            : []),
        ]

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">
          {t('settings.section_llm_label', 'Modelos LLM')}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t(
            'settings.section_llm_desc',
            'Escolhe se a Luna usa os teus modelos locais ou APIs cloud.',
          )}
        </p>
      </header>

      <section className="luna-card space-y-4">
        <h3 className="text-ui font-medium text-fg">
          {t('settings.llm_preference_title', 'Preferência de runtime')}
        </h3>
        <div className="space-y-2" role="radiogroup" aria-label="Modo LLM">
          {OPTIONS.map((opt) => {
            const active = preference === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => setPreference(opt.id)}
                className={[
                  'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-accent/40 bg-accent/10'
                    : 'border-line hover:border-accent/20 hover:bg-raised/50',
                ].join(' ')}
              >
                <span className="block text-ui font-medium text-fg">
                  {t(opt.titleKey, opt.titleDefault)}
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  {t(opt.descKey, opt.descDefault)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {showLocalConfig ? (
        <section className="luna-card space-y-4">
          <h3 className="text-ui font-medium text-fg">
            {t('settings.llm_local_server_title', 'Servidor local')}
          </h3>
          <label className="block space-y-1">
            <span className="text-[11px] text-fg-muted">
              {t('settings.llm_base_url_label', 'URL base (OpenAI-compat)')}
            </span>
            <input
              type="url"
              className="luna-input w-full font-mono text-[11px]"
              value={draft.baseUrl}
              disabled={disabled}
              onChange={(e) => updateDraft({ baseUrl: e.target.value })}
              placeholder="http://127.0.0.1:1234/v1"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5 text-[11px]"
              disabled={disabled || discovering}
              onClick={() => void discoverModels()}
            >
              {discovering
                ? t('settings.llm_refreshing_models', 'A listar…')
                : t('settings.llm_refresh_models', 'Actualizar lista')}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">
                {t('settings.llm_model_menor_label', 'Modelo menor')}
              </span>
              <select
                className="luna-input w-full font-mono text-[11px]"
                value={draft.modeloMenor}
                disabled={disabled}
                onChange={(e) => updateDraft({ modeloMenor: e.target.value })}
              >
                <option value="">
                  {t('settings.llm_select_model', '— escolhe —')}
                </option>
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-fg-dim">
                {t('settings.llm_model_menor_hint', 'Análise, memória, avaliador')}
              </span>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">
                {t('settings.llm_model_maior_label', 'Modelo maior')}
              </span>
              <select
                className="luna-input w-full font-mono text-[11px]"
                value={draft.modeloMaior}
                disabled={disabled}
                onChange={(e) => updateDraft({ modeloMaior: e.target.value })}
              >
                <option value="">
                  {t('settings.llm_select_model', '— escolhe —')}
                </option>
                {modelOptions.map((m) => (
                  <option key={`maior-${m.id}`} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-fg-dim">
                {t('settings.llm_model_maior_hint', 'Chat, agente Forge, planejador')}
              </span>
            </label>
          </div>

          <button
            type="button"
            className="text-[11px] text-accent hover:underline"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen
              ? t('settings.llm_hide_advanced', 'Ocultar avançado')
              : t('settings.llm_show_advanced', 'Avançado')}
          </button>

          {advancedOpen ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[11px] text-fg-muted">API key</span>
                <input
                  type="text"
                  className="luna-input w-full font-mono text-[11px]"
                  value={draft.apiKey}
                  disabled={disabled}
                  onChange={(e) => updateDraft({ apiKey: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-fg-muted">
                  {t('settings.llm_temp_maior_label', 'Temperatura maior')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  className="luna-input w-full font-mono text-[11px]"
                  value={draft.temperaturaMaior}
                  disabled={disabled}
                  onChange={(e) =>
                    updateDraft({ temperaturaMaior: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5 text-[11px]"
              disabled={disabled || testing}
              onClick={() => void testConnection()}
            >
              {testing
                ? t('settings.llm_testing', 'A testar…')
                : t('settings.llm_test', 'Testar ligação')}
            </button>
            <button
              type="button"
              className="luna-btn-primary px-3 py-1.5 text-[11px]"
              disabled={disabled || saving}
              onClick={() => void saveProfile()}
            >
              {saving
                ? t('settings.llm_saving', 'A guardar…')
                : t('settings.llm_save', 'Guardar')}
            </button>
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5 text-[11px]"
              disabled={disabled || applyingEnv}
              onClick={() => void applyToEnv()}
            >
              {applyingEnv
                ? t('settings.llm_applying_env', 'A aplicar…')
                : t('settings.llm_apply_env', 'Aplicar ao .env')}
            </button>
          </div>

          {testResult ? (
            <p
              className={`text-[11px] ${testResult.ok ? 'text-emerald-400/90' : 'text-amber-200/90'}`}
              role="status"
            >
              {testResult.message}
            </p>
          ) : null}

          {actionMessage ? (
            <p className="text-[11px] text-fg-muted" role="status">
              {actionMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="luna-card space-y-3 text-ui">
        <h3 className="font-medium text-fg">
          {t('settings.llm_status_title', 'Estado actual')}
        </h3>
        {loading ? (
          <p className="text-fg-muted">{t('common.loading', 'A carregar…')}</p>
        ) : runtimeInfo?.ok ? (
          <ul className="space-y-1.5 text-fg-muted">
            <li>
              {t('settings.llm_detected_env', 'Detectado no .env')}:{' '}
              <span className="text-fg">
                {detected === 'local' ? 'Local' : 'Cloud'}
              </span>
              {runtimeInfo.lunaApiBase ? (
                <span className="text-fg-dim"> ({runtimeInfo.lunaApiBase})</span>
              ) : null}
            </li>
            <li>
              {t('settings.llm_effective_ui', 'Efectivo na UI')}:{' '}
              <span className="text-fg">
                {effective === 'local' ? 'Local' : 'Cloud'}
              </span>
            </li>
            <li>
              {t('settings.llm_app_profile', 'Perfil na app')}:{' '}
              <span className="font-mono text-[11px] text-fg">
                {profile.modeloMenor && profile.modeloMaior
                  ? localModelLabel(profile)
                  : t('settings.llm_profile_incomplete', 'incompleto')}
              </span>
            </li>
            {runtimeInfo.modeloMaior ? (
              <li>
                {t('settings.llm_env_model_maior', 'Modelo maior (.env)')}:{' '}
                <span className="font-mono text-[11px] text-fg">
                  {runtimeInfo.modeloMaior}
                </span>
              </li>
            ) : null}
            {runtimeInfo.ollamaBase ? (
              <li>
                IDE / agente (Orbit):{' '}
                <span className="font-mono text-[11px] text-fg">
                  {runtimeInfo.ollamaBase}
                </span>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-fg-muted">{runtimeInfo?.error ?? 'Indisponível.'}</p>
        )}

        {mismatch && setupHint ? (
          <div
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90"
            role="status"
          >
            <p className="font-medium">
              {t(
                'settings.llm_env_mismatch',
                'O .env ainda não corresponde à preferência.',
              )}
            </p>
            <p className="mt-1 text-fg-muted">
              No terminal do Orbit: <code className="text-fg">{setupHint}</code>
              , depois reinicia <code className="text-fg">npm run dev</code>.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          className="luna-btn-secondary px-3 py-1.5 text-[11px]"
          disabled={disabled || loading}
          onClick={() => void refresh()}
        >
          {t('settings.llm_refresh', 'Actualizar estado')}
        </button>
      </section>

      <section className="luna-card space-y-2 text-[11px] text-fg-muted">
        <h3 className="text-ui font-medium text-fg">
          {t('settings.llm_layers_title', 'Duas camadas (resumo)')}
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="text-fg-dim">Modelos LLM</strong> (esta secção) — chat
            Luna Core e agente Forge.
          </li>
          <li>
            <strong className="text-fg-dim">Conta Lunar</strong> (secção Cloud) —
            sync, billing e login — independente do LM Studio.
          </li>
        </ul>
      </section>
    </div>
  )
}
