import { useEffect, useMemo, useState } from 'react'
import { useLunaAuth } from '../../auth/AuthProvider'
import { cloudSyncService } from '../../sync/cloudSyncService'
import { eventBus } from '../../../core/events/EventBus'
import { readLunaCloudConfig } from '../../../lib/lunaCloud'
import type { PreferencesSharedProps } from '../settingsSections'
import { useTranslation } from 'react-i18next'

export function CloudSection({ disabled }: PreferencesSharedProps) {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const cloud = useMemo(() => readLunaCloudConfig(), [])
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const unsubs = [
      eventBus.on('lunar:sync:start', () => setSyncTick((n) => n + 1)),
      eventBus.on('lunar:sync:complete', () => setSyncTick((n) => n + 1)),
      eventBus.on('lunar:sync:tick', () => setSyncTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const sync = cloudSyncService.getStatus()

  const modeLabel = auth.isLunarConnected
    ? t('settings.cloud_mode_active')
    : auth.usageMode === 'offline'
      ? t('settings.cloud_mode_offline')
      : t('settings.cloud_mode_no_session')

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_cloud_label', 'Conta Lunar')}</h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t('settings.cloud_hint', 'Modelos online hospedados pela Luna, sincronização entre dispositivos e loja remota. Modo offline: Ollama, IDE e RAG local neste computador.')}
        </p>
      </header>

      <section className="luna-card space-y-4">
        <h3 className="text-ui font-medium text-fg">{t('settings.cloud_current_mode')}</h3>
        <p className="text-ui text-fg">{modeLabel}</p>
        <div className="flex flex-wrap gap-2">
          {!auth.isLunarConnected ? (
            <>
              <button
                type="button"
                className="luna-btn-primary px-3 py-1.5"
                disabled={disabled || !auth.configured}
                onClick={() => void auth.signInWithGoogle()}
              >
                {t('settings.cloud_sign_in_google')}
              </button>
              <button
                type="button"
                className="luna-btn-secondary px-3 py-1.5"
                disabled={disabled}
                onClick={() => auth.openGate()}
              >
                {t('settings.cloud_account_options')}
              </button>
            </>
          ) : null}
          {auth.usageMode !== 'offline' ? (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => auth.continueOffline()}
            >
              {t('settings.cloud_go_offline')}
            </button>
          ) : (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => auth.setUsageModeCloud()}
            >
              {t('settings.cloud_prefer_cloud')}
            </button>
          )}
          {auth.isLunarConnected ? (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => void auth.signOut()}
            >
              {t('settings.cloud_sign_out')}
            </button>
          ) : null}
        </div>
        {auth.error ? (
          <p className="text-ui text-red-400/90" role="alert">
            {auth.error}
          </p>
        ) : null}
      </section>

      <section className="luna-card space-y-4">
        <h3 className="text-ui font-medium text-fg">{t('settings.cloud_sync_title')}</h3>
        <p className="text-ui text-fg-muted">
          {t('settings.cloud_sync_hint')}
        </p>
        <ul className="space-y-1 text-ui text-fg-muted">
          <li>
            Firestore:{' '}
            <span className={cloud.syncEnabled ? 'text-accent' : 'text-fg-dim'}>
              {cloud.syncEnabled
                ? t('common.on_f')
                : t('settings.cloud_sync_disabled')}
            </span>
          </li>
          <li>
            {t('settings.cloud_last_sync')}
            {' '}
            {sync.lastSyncAt
              ? new Date(sync.lastSyncAt).toLocaleString()
              : t('settings.cloud_never_synced')}
          </li>
          {sync.lastError ? (
            <li className="text-red-400/90">{sync.lastError}</li>
          ) : null}
        </ul>
        {auth.isLunarConnected && cloud.syncEnabled ? (
          <button
            type="button"
            className="luna-btn-secondary px-3 py-1.5"
            disabled={disabled || sync.pushing}
            onClick={() => void cloudSyncService.pullFromCloud()}
          >
            {t('settings.cloud_sync_now')}
          </button>
        ) : null}
      </section>

      <section className="luna-card space-y-2 text-ui text-fg-muted">
        <h3 className="font-medium text-fg">{t('settings.cloud_plan_title')}</h3>
        <p>
          {t('settings.cloud_plan_label')} <span className="text-fg">{auth.plan}</span>
          {' — '}
          {t('settings.cloud_plan_storage')}{' '}
          <span className="text-fg">25&nbsp;MB</span>{' '}
          {t('settings.cloud_plan_storage_hint')}
        </p>
      </section>
    </div>
  )
}
